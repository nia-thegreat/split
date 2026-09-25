// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { ReactNode } from 'react'
import { createGroup } from '../model/group'
import type { Group } from '../model/group'
import type { NewExpenseInput } from '../model/expense'
import { ExpenseFormScreen } from './ExpenseFormScreen'
import { GroupScreen } from './GroupScreen'
import { recordExpense } from '../model/expense'
import { rupeesToPaise as rs } from '../domain/money'

function makeGroup(): Group {
  const created = createGroup('Dinner', ['Nia', 'Rahul', 'Anu'])
  if (!created.ok) {
    throw new Error('expected a valid group')
  }
  return created.group
}

let containers: HTMLDivElement[] = []

Object.defineProperty(window, 'IS_REACT_ACT_ENVIRONMENT', { value: true })

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

function inputs(container: HTMLDivElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('input'))
}

function totalInput(container: HTMLDivElement): HTMLInputElement {
  const input = inputs(container).find((node) => node.placeholder === '0.00' && node.getAttribute('aria-label') !== 'Amount in rupees')
  if (!input) {
    throw new Error('expected a total input')
  }
  return input
}

function amountInputs(container: HTMLDivElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('input[aria-label="Amount in rupees"]'))
}

function setValue(input: HTMLInputElement, value: string): void {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function categorySelect(container: HTMLDivElement): HTMLSelectElement {
  const select = container.querySelector<HTMLSelectElement>('#expense-category')
  if (!select) {
    throw new Error('expected a category select')
  }
  return select
}

function setSelect(select: HTMLSelectElement, value: string): void {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set
    setter?.call(select, value)
    select.dispatchEvent(new Event('change', { bubbles: true }))
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

describe('ExpenseFormScreen flow', () => {
  it('auto-fills a single payer amount with the total', () => {
    const group = makeGroup()
    const container = mount(
      <ExpenseFormScreen group={group} onSave={() => ({ ok: true })} onCancel={() => {}} />,
    )
    expect(amountInputs(container)).toHaveLength(1)
    expect(amountInputs(container)[0].value).toBe('')

    setValue(totalInput(container), '300')

    expect(amountInputs(container)[0].value).toBe('300')
  })

  it('keeps Save disabled until paid and shares both match the total', () => {
    const group = makeGroup()
    const container = mount(
      <ExpenseFormScreen group={group} onSave={() => ({ ok: true })} onCancel={() => {}} />,
    )
    const save = findButton(container, 'Save expense')

    expect(save?.disabled).toBe(true)

    setValue(totalInput(container), '300')
    expect(save?.disabled).toBe(true)

    click(findButton(container, 'Nia'))
    expect(amountInputs(container)).toHaveLength(2)
    expect(save?.disabled).toBe(true)

    click(findButton(container, 'Rahul'))
    click(findButton(container, 'Split equally'))
    expect(amountInputs(container)[1].value).toBe('150.00')
    expect(amountInputs(container)[2].value).toBe('150.00')
    expect(screenText(container)).toContain('Shares ₹300.00 / ₹300.00')
    expect(save?.disabled).toBe(false)

    click(save)
  })

  it('chip selection toggles the person share row', () => {
    const group = makeGroup()
    const container = mount(
      <ExpenseFormScreen group={group} onSave={() => ({ ok: true })} onCancel={() => {}} />,
    )
    const niaChip = findButton(container, 'Nia')

    expect(niaChip?.getAttribute('aria-pressed')).toBe('false')
    expect(amountInputs(container)).toHaveLength(1)

    click(niaChip)
    expect(niaChip?.getAttribute('aria-pressed')).toBe('true')
    expect(amountInputs(container)).toHaveLength(2)

    click(niaChip)
    expect(niaChip?.getAttribute('aria-pressed')).toBe('false')
    expect(amountInputs(container)).toHaveLength(1)
  })

  it('sends the chosen category to onSave', () => {
    const group = makeGroup()
    const onSave = vi.fn((input: NewExpenseInput): { ok: true } => {
      void input
      return { ok: true }
    })
    const container = mount(
      <ExpenseFormScreen group={group} onSave={onSave} onCancel={() => {}} />,
    )

    setValue(totalInput(container), '300')
    click(findButton(container, 'Nia'))
    click(findButton(container, 'Split equally'))
    expect(categorySelect(container).value).toBe('Other')
    setSelect(categorySelect(container), 'Shopping')
    click(findButton(container, 'Save expense'))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].category).toBe('Shopping')
  })
})

describe('GroupScreen delete confirmation', () => {
  function makeGroupWithExpenses(): Group {
    const created = makeGroup()
    const recorded = recordExpense(created, {
      description: 'Dinner at the casa',
      totalPaise: rs('3000'),
      payments: [{ personId: created.people[0].id, amountPaise: rs('3000') }],
      shares: created.people.map((person) => ({ personId: person.id, amountPaise: rs('1000') })),
    })
    if (!recorded.ok) {
      throw new Error('expected a valid expense')
    }
    return recorded.group
  }

  it('requires confirmation before removing an expense', () => {
    const group = makeGroupWithExpenses()
    const onRemoveExpense = vi.fn()
    const container = mount(
      <GroupScreen
        group={group}
        onAddExpense={() => {}}
        onEditExpense={() => {}}
        onRemoveExpense={onRemoveExpense}
        onReset={() => {}}
      />,
    )
    const trash = () =>
      Array.from(container.querySelectorAll('button')).find(
        (button) => button.getAttribute('aria-label') === 'Remove Dinner at the casa',
      )

    click(trash())
    expect(screenText(container)).toContain('Delete this expense?')
    expect(onRemoveExpense).not.toHaveBeenCalled()

    click(findButton(container, 'Cancel'))
    expect(screenText(container)).not.toContain('Delete this expense?')
    expect(onRemoveExpense).not.toHaveBeenCalled()

    click(trash())
    click(findButton(container, 'Delete'))
    expect(onRemoveExpense).toHaveBeenCalledTimes(1)
  })
})