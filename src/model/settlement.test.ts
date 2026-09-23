import { describe, expect, it } from 'vitest'
import { rupeesToPaise as rs } from '../domain/money'
import { recordExpense } from './expense'
import { createGroup } from './group'
import type { Group } from './group'
import { getGroupBalances, getGroupSettlements } from './settlement'

function makeGroup(personNames: string[]): Group {
  const created = createGroup('Trip', personNames)
  if (!created.ok) {
    throw new Error('expected a valid group')
  }
  return created.group
}

function peopleByName(group: Group): Record<string, { id: string }> {
  return Object.fromEntries(group.people.map((person) => [person.name, person]))
}

describe('getGroupBalances', () => {
  it('lists every group member with a net balance, in group order', () => {
    const group = makeGroup(['Nia', 'Rahul', 'Anu', 'Sara'])
    const people = peopleByName(group)
    const recorded = recordExpense(group, {
      description: 'Dinner',
      totalPaise: rs('2000'),
      payments: [
        { personId: people['Nia'].id, amountPaise: rs('1000') },
        { personId: people['Rahul'].id, amountPaise: rs('600') },
        { personId: people['Anu'].id, amountPaise: rs('400') },
      ],
      shares: [
        { personId: people['Nia'].id, amountPaise: rs('500') },
        { personId: people['Rahul'].id, amountPaise: rs('700') },
        { personId: people['Anu'].id, amountPaise: rs('300') },
        { personId: people['Sara'].id, amountPaise: rs('500') },
      ],
    })
    if (!recorded.ok) {
      throw new Error('expected a valid expense')
    }

    expect(getGroupBalances(recorded.group).map((balance) => balance.balancePaise)).toEqual([
      rs('500'),
      -rs('100'),
      rs('100'),
      -rs('500'),
    ])
  })

  it('aggregates net balances across multiple expenses', () => {
    const group = makeGroup(['Nia', 'Rahul', 'Anu'])
    const people = peopleByName(group)
    const first = recordExpense(group, {
      description: 'Dinner',
      totalPaise: rs('3000'),
      payments: [{ personId: people['Nia'].id, amountPaise: rs('3000') }],
      shares: [
        { personId: people['Nia'].id, amountPaise: rs('1000') },
        { personId: people['Rahul'].id, amountPaise: rs('1000') },
        { personId: people['Anu'].id, amountPaise: rs('1000') },
      ],
    })
    if (!first.ok) {
      throw new Error('expected a valid expense')
    }
    const second = recordExpense(first.group, {
      description: 'Groceries',
      totalPaise: rs('200'),
      payments: [{ personId: people['Rahul'].id, amountPaise: rs('200') }],
      shares: [{ personId: people['Anu'].id, amountPaise: rs('200') }],
    })
    if (!second.ok) {
      throw new Error('expected a valid expense')
    }

    expect(getGroupBalances(second.group).map((balance) => balance.balancePaise)).toEqual([
      rs('2000'),
      -rs('800'),
      -rs('1200'),
    ])
  })

  it('returns zero balances for a group with no expenses', () => {
    const group = makeGroup(['Nia', 'Rahul'])
    expect(getGroupBalances(group).map((balance) => balance.balancePaise)).toEqual([0, 0])
  })
})

describe('getGroupSettlements', () => {
  it('produces practical transfers between debtors and creditors', () => {
    const group = makeGroup(['Nia', 'Rahul', 'Anu', 'Sara'])
    const people = peopleByName(group)
    const recorded = recordExpense(group, {
      description: 'Dinner',
      totalPaise: rs('2000'),
      payments: [
        { personId: people['Nia'].id, amountPaise: rs('1000') },
        { personId: people['Rahul'].id, amountPaise: rs('600') },
        { personId: people['Anu'].id, amountPaise: rs('400') },
      ],
      shares: [
        { personId: people['Nia'].id, amountPaise: rs('500') },
        { personId: people['Rahul'].id, amountPaise: rs('700') },
        { personId: people['Anu'].id, amountPaise: rs('300') },
        { personId: people['Sara'].id, amountPaise: rs('500') },
      ],
    })
    if (!recorded.ok) {
      throw new Error('expected a valid expense')
    }

    expect(getGroupSettlements(recorded.group)).toEqual([
      {
        fromId: people['Sara'].id,
        fromName: 'Sara',
        toId: people['Nia'].id,
        toName: 'Nia',
        amountPaise: rs('500'),
      },
      {
        fromId: people['Rahul'].id,
        fromName: 'Rahul',
        toId: people['Anu'].id,
        toName: 'Anu',
        amountPaise: rs('100'),
      },
    ])
  })

  it('returns no transfers when everyone is settled', () => {
    const group = makeGroup(['Nia', 'Rahul'])
    const people = peopleByName(group)
    const dinner = recordExpense(group, {
      description: 'Dinner',
      totalPaise: rs('300'),
      payments: [{ personId: people['Nia'].id, amountPaise: rs('300') }],
      shares: [
        { personId: people['Nia'].id, amountPaise: rs('150') },
        { personId: people['Rahul'].id, amountPaise: rs('150') },
      ],
    })
    if (!dinner.ok) {
      throw new Error('expected a valid expense')
    }
    const cab = recordExpense(dinner.group, {
      description: 'Cab',
      totalPaise: rs('300'),
      payments: [{ personId: people['Rahul'].id, amountPaise: rs('300') }],
      shares: [
        { personId: people['Nia'].id, amountPaise: rs('150') },
        { personId: people['Rahul'].id, amountPaise: rs('150') },
      ],
    })
    if (!cab.ok) {
      throw new Error('expected a valid expense')
    }
    expect(getGroupSettlements(cab.group)).toEqual([])
  })

  it('returns no transfers for a balanced single-person group', () => {
    const group = makeGroup(['Nia'])
    const people = peopleByName(group)
    const recorded = recordExpense(group, {
      description: 'Bills',
      totalPaise: rs('500'),
      payments: [{ personId: people['Nia'].id, amountPaise: rs('500') }],
      shares: [{ personId: people['Nia'].id, amountPaise: rs('500') }],
    })
    if (!recorded.ok) {
      throw new Error('expected a valid expense')
    }
    expect(getGroupBalances(recorded.group)[0]?.balancePaise).toBe(0)
    expect(getGroupSettlements(recorded.group)).toEqual([])
  })

  it('returns no transfers for a group with no expenses', () => {
    const group = makeGroup(['Nia', 'Rahul'])
    expect(getGroupSettlements(group)).toEqual([])
  })
})