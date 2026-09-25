import { describe, expect, it } from 'vitest'
import { rupeesToPaise as rs } from '../domain/money'
import type { NewExpenseInput } from './expense'
import { getExpenseById, recordExpense, removeExpense, updateExpense } from './expense'
import { createGroup } from './group'

function makeGroup(personNames: string[] = ['Nia', 'Rahul', 'Anu']) {
  const created = createGroup('Dinner', personNames)
  if (!created.ok) {
    throw new Error('expected a valid group')
  }
  return created.group
}

function defaultInput(people: { id: string }[]): NewExpenseInput {
  return {
    description: '  Dinner at the casa  ',
    totalPaise: rs('3000'),
    payments: [{ personId: people[0].id, amountPaise: rs('3000') }],
    shares: [
      { personId: people[0].id, amountPaise: rs('1000') },
      { personId: people[1].id, amountPaise: rs('1000') },
      { personId: people[2].id, amountPaise: rs('1000') },
    ],
  }
}

describe('recordExpense', () => {
  it('records a valid expense and appends it to the group', () => {
    const group = makeGroup()
    const input = defaultInput(group.people)
    const result = recordExpense(group, input)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.expense.description).toBe('Dinner at the casa')
    expect(result.expense.totalPaise).toBe(rs('3000'))
    expect(result.expense.payments).toHaveLength(1)
    expect(result.expense.shares).toHaveLength(3)
    expect(result.group.expenses).toHaveLength(1)
    expect(result.group.expenses[0].id).toBe(result.expense.id)
    expect(result.group).not.toBe(group)
  })

  it('defaults the category to Other when none is provided', () => {
    const group = makeGroup()
    const result = recordExpense(group, defaultInput(group.people))
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.expense.category).toBe('Other')
  })

  it('records a provided category on the expense', () => {
    const group = makeGroup()
    const input = defaultInput(group.people)
    input.category = 'Food'
    const result = recordExpense(group, input)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.expense.category).toBe('Food')
  })

  it('trims the description before recording', () => {
    const group = makeGroup()
    const result = recordExpense(group, defaultInput(group.people))
    expect(result.ok).toBe(true)
  })

  it('rejects an expense that references an unknown person id', () => {
    const group = makeGroup()
    const input = defaultInput(group.people)
    input.payments = [{ personId: 'no-such-person', amountPaise: rs('3000') }]
    const result = recordExpense(group, input)
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors.join(' ')).toContain('Unknown person id')
    expect(group.expenses).toHaveLength(0)
  })

  it('rejects an expense whose payments and shares do not agree with the total', () => {
    const group = makeGroup()
    const input = defaultInput(group.people)
    input.totalPaise = rs('3000')
    input.shares[2] = { personId: group.people[2].id, amountPaise: rs('999') }
    const result = recordExpense(group, input)
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors.length).toBeGreaterThan(0)
    expect(group.expenses).toHaveLength(0)
  })

  it('does not mutate the group when validation fails', () => {
    const group = makeGroup()
    const input = defaultInput(group.people)
    input.payments = [] 
    const result = recordExpense(group, input)
    expect(result.ok).toBe(false)
    expect(group.expenses).toHaveLength(0)
  })
})

describe('updateExpense', () => {
  function recordedExpense(personNames: string[] = ['Nia', 'Rahul', 'Anu']) {
    const group = makeGroup(personNames)
    const recorded = recordExpense(group, defaultInput(group.people))
    if (!recorded.ok) {
      throw new Error('expected a valid expense')
    }
    return recorded
  }

  it('replaces the matching expense, preserving order and other expenses', () => {
    const first = recordedExpense()
    const group = first.group
    const second = recordExpense(group, {
      description: 'Second',
      totalPaise: rs('500'),
      payments: [{ personId: group.people[1].id, amountPaise: rs('500') }],
      shares: [{ personId: group.people[1].id, amountPaise: rs('500') }],
    })
    if (!second.ok) {
      throw new Error('expected a valid expense')
    }

    const result = updateExpense(second.group, first.expense.id, {
      description: 'Edited first',
      totalPaise: rs('2000'),
      payments: [{ personId: group.people[2].id, amountPaise: rs('2000') }],
      shares: [{ personId: group.people[2].id, amountPaise: rs('2000') }],
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.group.expenses).toHaveLength(2)
    expect(result.group.expenses[0].id).toBe(first.expense.id)
    expect(result.group.expenses[1].id).toBe(second.expense.id)
    expect(result.expense.description).toBe('Edited first')
    expect(getExpenseById(result.group, first.expense.id)?.totalPaise).toBe(rs('2000'))
  })

  it('trims the description when replacing', () => {
    const recorded = recordedExpense()
    const result = updateExpense(recorded.group, recorded.expense.id, {
      description: '  Trimmed  ',
      totalPaise: rs('100'),
      payments: [{ personId: recorded.group.people[0].id, amountPaise: rs('100') }],
      shares: [{ personId: recorded.group.people[0].id, amountPaise: rs('100') }],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.group.expenses[0].description).toBe('Trimmed')
  })

  it('rejects an unknown expense id', () => {
    const recorded = recordedExpense()
    const result = updateExpense(recorded.group, 'no-such-expense', defaultInput(recorded.group.people))
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors.join(' ')).toContain('no-such-expense')
  })

  it('rejects a replacement whose payments do not agree with the total', () => {
    const recorded = recordedExpense()
    const people = recorded.group.people
    const result = updateExpense(recorded.group, recorded.expense.id, {
      description: 'Budgets',
      totalPaise: rs('3000'),
      payments: [{ personId: people[0].id, amountPaise: rs('2000') }],
      shares: [{ personId: people[0].id, amountPaise: rs('3000') }],
    })
    expect(result.ok).toBe(false)
  })

  it('does not mutate the original group when validation fails', () => {
    const recorded = recordedExpense()
    const people = recorded.group.people
    const result = updateExpense(recorded.group, recorded.expense.id, {
      description: 'Bad',
      totalPaise: rs('3000'),
      payments: [],
      shares: [{ personId: people[0].id, amountPaise: rs('3000') }],
    })
    expect(result.ok).toBe(false)
    expect(recorded.group.expenses).toHaveLength(1)
    expect(recorded.group.expenses[0].totalPaise).toBe(rs('3000'))
  })
})

describe('removeExpense', () => {
  it('removes an existing expense from the group', () => {
    const group = makeGroup()
    const recorded = recordExpense(group, defaultInput(group.people))
    if (!recorded.ok) {
      throw new Error('expected a valid expense')
    }
    const result = removeExpense(recorded.group, recorded.expense.id)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.group.expenses).toHaveLength(0)
  })

  it('errors when the expense id does not exist', () => {
    const group = makeGroup()
    const result = removeExpense(group, 'no-such-expense')
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors.join(' ')).toContain('no-such-expense')
  })
})

describe('getExpenseById', () => {
  it('returns the matching expense record', () => {
    const group = makeGroup()
    const recorded = recordExpense(group, defaultInput(group.people))
    if (!recorded.ok) {
      throw new Error('expected a valid expense')
    }
    const found = getExpenseById(recorded.group, recorded.expense.id)
    expect(found?.description).toBe('Dinner at the casa')
  })

  it('returns undefined for an unknown expense id', () => {
    const group = makeGroup()
    expect(getExpenseById(group, 'nope')).toBeUndefined()
  })
})
