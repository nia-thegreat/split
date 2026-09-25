import { describe, expect, it } from 'vitest'
import { rupeesToPaise as rs } from '../domain/money'
import { recordExpense } from '../model/expense'
import { createGroup } from '../model/group'
import { clearGroup, loadGroup, saveGroup, STORAGE_KEY } from './storage'
import type { StorageLike } from './storage'

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

function realisticGroup() {
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

describe('saveGroup', () => {
  it('writes a parseable JSON blob under the storage key', () => {
    const storage = new MemoryStorage()
    const group = realisticGroup()

    saveGroup(group, storage)

    const raw = storage.raw()
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw ?? '')
    expect(parsed.id).toBe(group.id)
    expect(parsed.name).toBe('Dinner')
    expect(parsed.people).toHaveLength(3)
    expect(parsed.expenses).toHaveLength(1)
    expect(parsed.expenses[0].category).toBe('Other')
  })

  it('round-trips ids and paise amounts exactly', () => {
    const storage = new MemoryStorage()
    const group = realisticGroup()

    saveGroup(group, storage)
    const loaded = loadGroup(storage)

    expect(loaded).toEqual(group)
    expect(loaded?.expenses[0].totalPaise).toBe(rs('3000'))
    expect(loaded?.expenses[0].shares.map((share) => share.amountPaise)).toEqual([
      rs('1000'),
      rs('1000'),
      rs('1000'),
    ])
    expect(loaded?.people.map((person) => person.id)).toEqual(group.people.map((person) => person.id))
  })
})

describe('loadGroup', () => {
  it('returns null when nothing is stored', () => {
    expect(loadGroup(new MemoryStorage())).toBeNull()
  })

  it('returns null for malformed JSON and clears the stored data', () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, '{oops, not json')

    expect(loadGroup(storage)).toBeNull()
    expect(storage.raw()).toBeNull()
  })

  it('returns null for well-formed JSON with the wrong shape and clears it', () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, JSON.stringify({ id: 123, name: 'Dinner', people: 'Nia' }))

    expect(loadGroup(storage)).toBeNull()
    expect(storage.raw()).toBeNull()
  })

  it('returns null for structurally invalid amounts and clears the data', () => {
    const group = realisticGroup()
    const storage = new MemoryStorage()
    saveGroup(group, storage)

    const stored = JSON.parse(storage.raw() ?? '{}')
    stored.people[0].id = ''
    storage.setItem(STORAGE_KEY, JSON.stringify(stored))

    expect(loadGroup(storage)).toBeNull()
    expect(storage.raw()).toBeNull()
  })

  it('defaults missing categories from older data to Other', () => {
    const group = realisticGroup()
    const storage = new MemoryStorage()
    saveGroup(group, storage)

    const stored = JSON.parse(storage.raw() ?? '{}')
    delete stored.expenses[0].category
    storage.setItem(STORAGE_KEY, JSON.stringify(stored))

    const loaded = loadGroup(storage)
    expect(loaded?.expenses[0].category).toBe('Other')
    expect(storage.raw()).not.toBeNull()
  })

  it('degrades gracefully when no storage backend is available', () => {
    expect(loadGroup()).toBeNull()
  })
})

describe('clearGroup', () => {
  it('removes the stored group', () => {
    const storage = new MemoryStorage()
    const group = realisticGroup()

    saveGroup(group, storage)
    expect(storage.raw()).not.toBeNull()

    clearGroup(storage)

    expect(storage.raw()).toBeNull()
    expect(loadGroup(storage)).toBeNull()
  })

  it('is a no-op when nothing is stored', () => {
    const storage = new MemoryStorage()
    expect(() => clearGroup(storage)).not.toThrow()
  })
})