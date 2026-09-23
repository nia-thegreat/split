// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { ReactNode } from 'react'
import { rupeesToPaise as rs } from '../domain/money'
import { recordExpense } from '../model/expense'
import { createGroup } from '../model/group'
import type { Group } from '../model/group'
import { GroupScreen } from './GroupScreen'

function makeGroup(): Group {
  const created = createGroup('Dinner', ['Nia', 'Rahul', 'Anu'])
  if (!created.ok) {
    throw new Error('expected a valid group')
  }
  const recorded = recordExpense(created.group, {
    description: 'Dinner at the casa',
    totalPaise: rs('3000'),
    payments: [{ personId: created.group.people[0].id, amountPaise: rs('3000') }],
    shares: created.group.people.map((person) => ({ personId: person.id, amountPaise: rs('1000') })),
  })
  if (!recorded.ok) {
    throw new Error('expected a valid expense')
  }
  return recorded.group
}

let containers: HTMLDivElement[] = []

function mount(node: ReactNode): HTMLDivElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  containers.push(container)
  const root = createRoot(container)
  act(() => {
    root.render(node)
  })
  return container
}

function findButton(container: HTMLDivElement, label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === label)
}

function click(button: HTMLButtonElement | undefined): void {
  act(() => {
    button?.click()
  })
}

function screenText(container: HTMLDivElement): string {
  return container.textContent ?? ''
}

afterEach(() => {
  for (const container of containers) {
    container.remove()
  }
  containers = []
})

describe('GroupScreen new group flow', () => {
  it('renders a New group action next to the existing content', () => {
    const group = makeGroup()
    const container = mount(
      <GroupScreen group={group} onAddExpense={() => {}} onEditExpense={() => {}} onRemoveExpense={() => {}} onReset={() => {}} />,
    )
    expect(findButton(container, 'New group')).toBeDefined()
    expect(screenText(container)).toContain('Dinner')
    expect(screenText(container)).toContain('Dinner at the casa')
  })

  it('cancel leaves the current group and expenses untouched', () => {
    const group = makeGroup()
    const snapshot = structuredClone(group)
    const onReset = vi.fn()
    const container = mount(
      <GroupScreen group={group} onAddExpense={() => {}} onEditExpense={() => {}} onRemoveExpense={() => {}} onReset={onReset} />,
    )

    click(findButton(container, 'New group'))
    expect(screenText(container)).toContain('Start a new group?')
    expect(screenText(container)).toContain('Dinner at the casa')

    click(findButton(container, 'Cancel'))
    expect(screenText(container)).not.toContain('Start a new group?')
    expect(screenText(container)).toContain('Dinner at the casa')
    expect(onReset).not.toHaveBeenCalled()
    expect(group).toEqual(snapshot)
  })

  it('confirming calls the reset handler', () => {
    const group = makeGroup()
    const onReset = vi.fn()
    const container = mount(
      <GroupScreen group={group} onAddExpense={() => {}} onEditExpense={() => {}} onRemoveExpense={() => {}} onReset={onReset} />,
    )

    click(findButton(container, 'New group'))
    click(findButton(container, 'Start new group'))

    expect(onReset).toHaveBeenCalledTimes(1)
  })
})