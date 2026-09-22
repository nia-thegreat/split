import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { rupeesToPaise as rs } from '../domain/money'
import { recordExpense } from '../model/expense'
import { createGroup } from '../model/group'
import { GroupScreen } from './GroupScreen'
import { ExpenseFormScreen } from './ExpenseFormScreen'

function makeGroup(personNames: string[] = ['Nia', 'Rahul', 'Anu']) {
  const created = createGroup('Dinner', personNames)
  if (!created.ok) {
    throw new Error('expected a valid group')
  }
  return created.group
}

describe('ExpenseFormScreen', () => {
  it('renders the create form fields', () => {
    const group = makeGroup()
    const html = renderToStaticMarkup(
      <ExpenseFormScreen group={group} onSave={() => ({ ok: true })} onCancel={() => {}} />,
    )
    expect(html).toContain('Add expense')
    expect(html).toContain('Description')
    expect(html).toContain('Total amount')
    expect(html).toContain('Paid by')
    expect(html).toContain('Owed by')
    expect(html).toContain('Split equally')
    expect(html).toContain('Split between')
    expect(html).toContain('Save expense')
  })

  it('prefills edit mode from the existing expense', () => {
    const group = makeGroup()
    const recorded = recordExpense(group, {
      description: 'Lunch',
      totalPaise: rs('100'),
      payments: [{ personId: group.people[0].id, amountPaise: rs('100') }],
      shares: [
        { personId: group.people[0].id, amountPaise: rs('50') },
        { personId: group.people[1].id, amountPaise: rs('50') },
      ],
    })
    if (!recorded.ok) {
      throw new Error('expected a valid expense')
    }
    const html = renderToStaticMarkup(
      <ExpenseFormScreen
        group={recorded.group}
        initialExpense={recorded.expense}
        onSave={() => ({ ok: true })}
        onCancel={() => {}}
      />,
    )
    expect(html).toContain('Edit expense')
    expect(html).toContain('value="100.00"')
    expect(html).toContain('value="50.00"')
  })
})

describe('GroupScreen', () => {
  it('shows an empty expenses state and an add action', () => {
    const group = makeGroup()
    const html = renderToStaticMarkup(
      <GroupScreen group={group} onAddExpense={() => {}} onEditExpense={() => {}} onRemoveExpense={() => {}} />,
    )
    expect(html).toContain('No expenses yet')
    expect(html).toContain('Add expense')
  })

  it('lists recorded expenses with totals', () => {
    const group = makeGroup()
    const recorded = recordExpense(group, {
      description: 'Dinner at the casa',
      totalPaise: rs('3000'),
      payments: [{ personId: group.people[0].id, amountPaise: rs('3000') }],
      shares: [
        { personId: group.people[0].id, amountPaise: rs('1000') },
        { personId: group.people[1].id, amountPaise: rs('1000') },
        { personId: group.people[2].id, amountPaise: rs('1000') },
      ],
    })
    if (!recorded.ok) {
      throw new Error('expected a valid expense')
    }
    const html = renderToStaticMarkup(
      <GroupScreen
        group={recorded.group}
        onAddExpense={() => {}}
        onEditExpense={() => {}}
        onRemoveExpense={() => {}}
      />,
    )
    expect(html).toContain('Dinner at the casa')
    expect(html).toContain('₹3000.00')
    expect(html).toContain('Paid by Nia')
  })
})