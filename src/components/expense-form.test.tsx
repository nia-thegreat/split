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
    expect(html).toContain('Who actually paid')
    expect(html).toContain('Who should bear the cost')
    expect(html).toContain('Paid ₹')
    expect(html).toContain('Category')
    expect(html).toContain('Food')
    expect(html).toContain('Travel')
    expect(html).toContain('Stay')
    expect(html).toContain('Shopping')
    expect(html).toContain('Entertainment')
    expect(html).toContain('Other')
  })

  it('prefills edit mode from the existing expense', () => {
    const group = makeGroup()
    const recorded = recordExpense(group, {
      description: 'Lunch',
      category: 'Food',
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
    expect(html).toContain('value="Food"')
  })
})

describe('GroupScreen', () => {
  it('shows an empty expenses state and an add action', () => {
    const group = makeGroup()
    const html = renderToStaticMarkup(
      <GroupScreen
        group={group}
        onAddExpense={() => {}}
        onEditExpense={() => {}}
        onRemoveExpense={() => {}}
        onReset={() => {}}
      />,
    )
    expect(html).toContain('No expenses yet')
    expect(html).toContain('Add expense')
    expect(html).toContain('New group')
  })

  it('lists recorded expenses with totals', () => {
    const group = makeGroup()
    const recorded = recordExpense(group, {
      description: 'Dinner at the casa',
      category: 'Food',
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
        onReset={() => {}}
      />,
    )
    expect(html).toContain('Dinner at the casa')
    expect(html).toContain('₹3000.00')
    expect(html).toContain('Paid by Nia')
    expect(html).toContain('Rahul owes ₹1000.00')
    expect(html).toContain('>Food</span>')
  })

  it('shows correct balances for each person', () => {
    const group = makeGroup()
    const reported = recordExpense(group, {
      description: 'Dinner',
      totalPaise: rs('3000'),
      payments: [{ personId: group.people[0].id, amountPaise: rs('3000') }],
      shares: group.people.map((person) => ({ personId: person.id, amountPaise: rs('1000') })),
    })
    if (!reported.ok) {
      throw new Error('expected a valid expense')
    }
    const html = renderToStaticMarkup(
      <GroupScreen
        group={reported.group}
        onAddExpense={() => {}}
        onEditExpense={() => {}}
        onRemoveExpense={() => {}}
        onReset={() => {}}
      />,
    )
    expect(html).toContain('Balances')
    expect(html).toContain('is owed ₹2000.00')
    expect(html).toContain('owes ₹1000.00')
    expect(html).not.toContain('>Other</span>')
  })

  it('shows suggested transfers between debtors and creditors', () => {
    const group = makeGroup()
    const reported = recordExpense(group, {
      description: 'Dinner',
      totalPaise: rs('3000'),
      payments: [{ personId: group.people[0].id, amountPaise: rs('3000') }],
      shares: group.people.map((person) => ({ personId: person.id, amountPaise: rs('1000') })),
    })
    if (!reported.ok) {
      throw new Error('expected a valid expense')
    }
    const html = renderToStaticMarkup(
      <GroupScreen
        group={reported.group}
        onAddExpense={() => {}}
        onEditExpense={() => {}}
        onRemoveExpense={() => {}}
        onReset={() => {}}
      />,
    )
    expect(html).toContain('Suggested transfers to settle up')
    expect(html).toContain('Rahul')
    expect(html).toContain('→')
    expect(html).toContain('₹1000.00')
  })

  it('shows a single empty state before any expenses', () => {
    const group = makeGroup()
    const html = renderToStaticMarkup(
      <GroupScreen
        group={group}
        onAddExpense={() => {}}
        onEditExpense={() => {}}
        onRemoveExpense={() => {}}
        onReset={() => {}}
      />,
    )
    expect(html).toContain('No expenses yet — add the first one.')
    expect(html).not.toContain('Balances')
    expect(html).not.toContain('Suggested transfers')
  })
})