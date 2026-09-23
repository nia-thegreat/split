import { describe, expect, it, vi } from 'vitest'
import { rupeesToPaise as rs } from '../domain/money'
import { recordExpense } from '../model/expense'
import { createGroup } from '../model/group'
import { clearGroup, loadGroup, saveGroup, STORAGE_KEY } from '../lib/storage'
import type { StorageLike } from '../lib/storage'
import type { Group } from '../model/group'
import type { Id } from '../model/id'
import { resetGroup } from './usePersistedGroup'

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>()

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  raw(): string | null {
    return this.data.get(STORAGE_KEY) ?? null
  }
}

function realisticGroup(): Group {
  const created = createGroup('Dinner', ['Nia', 'Rahul', 'Anu'])
  if (!created.ok) {
    throw new Error('expected a valid group')
  }
  const recorded = recordExpense(created.group, {
    description: 'Dinner at the casa',
    totalPaise: rs('3000'),
    payments: [{ personId: created.group.people[0].id, amountPaise: rs('3000') }],
    shares: [
      { personId: created.group.people[0].id, amountPaise: rs('1000') },
      { personId: created.group.people[1].id, amountPaise: rs('1000') },
      { personId: created.group.people[2].id, amountPaise: rs('1000') },
    ],
  })
  if (!recorded.ok) {
    throw new Error('expected a valid expense')
  }
  return recorded.group
}

describe('resetGroup', () => {
  it('clears the persisted group and sets React state to null', () => {
    const storage = new MemoryStorage()
    saveGroup(realisticGroup(), storage)
    const setGroup = vi.fn()

    resetGroup(storage, setGroup)

    expect(storage.raw()).toBeNull()
    expect(setGroup).toHaveBeenCalledWith(null)
    expect(loadGroup(storage)).toBeNull()
  })

  it('is a no-op when nothing is persisted', () => {
    const storage = new MemoryStorage()
    const setGroup = vi.fn()
    expect(storage.raw()).toBeNull()

    resetGroup(storage, setGroup)

    expect(storage.raw()).toBeNull()
    expect(setGroup).toHaveBeenCalledWith(null)
  })

  it('does not throw when no storage is available', () => {
    const setGroup = vi.fn()
    expect(() => resetGroup(undefined, setGroup)).not.toThrow()
    expect(setGroup).toHaveBeenCalledWith(null)
  })

  it('reuses clearGroup semantics', () => {
    const storage = new MemoryStorage()
    saveGroup(realisticGroup(), storage)

    resetGroup(storage, vi.fn())

    expect(loadGroup(storage)).toBeNull()
    clearGroup(storage)
    expect(storage.raw()).toBeNull()
  })
})

describe('persistence with injected storage', () => {
  it('round-trips a group through an injected store and resets it', () => {
    const storage = new MemoryStorage()
    const group = realisticGroup()
    saveGroup(group, storage)
    expect(loadGroup(storage)?.name).toBe('Dinner')

    const referencedPersonIds = group.expenses.flatMap((expense) =>
      expense.payments.map((payment) => payment.personId as Id),
    )
    expect(referencedPersonIds.length).toBeGreaterThan(0)

    resetGroup(storage, vi.fn())
    expect(loadGroup(storage)).toBeNull()
  })
})