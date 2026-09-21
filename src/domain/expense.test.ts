import { describe, expect, it } from 'vitest'
import { calculateBalances, calculateSettlements, totalOwed, totalPaid } from './expense'
import type { Balance, Expense, Settlement } from './expense'
import { rupeesToPaise as rs } from './money'

function makeExpense(
  description: string,
  totalRupees: string,
  payments: Array<[string, string]>,
  shares: Array<[string, string]>,
): Expense {
  return {
    description,
    totalPaise: rs(totalRupees),
    payments: payments.map(([person, amount]) => ({ person, amountPaise: rs(amount) })),
    shares: shares.map(([person, amount]) => ({ person, amountPaise: rs(amount) })),
  }
}

function balancesByName(expense: Expense): Record<string, number> {
  return Object.fromEntries(
    calculateBalances(expense).map((balance) => [balance.person, balance.balancePaise]),
  )
}

function applySettlements(balances: Balance[], settlements: Settlement[]): Record<string, number> {
  const ledger = Object.fromEntries(balances.map((balance) => [balance.person, balance.balancePaise]))
  for (const settlement of settlements) {
    ledger[settlement.from] += settlement.amountPaise
    ledger[settlement.to] -= settlement.amountPaise
  }
  return ledger
}

describe('totals', () => {
  it('sums payments and shares separately', () => {
    const expense: Expense = {
      description: 'Dinner',
      totalPaise: rs('2000'),
      payments: [
        { person: 'Nia', amountPaise: rs('1000') },
        { person: 'Rahul', amountPaise: rs('600') },
        { person: 'Anu', amountPaise: rs('400') },
      ],
      shares: [
        { person: 'Nia', amountPaise: rs('500') },
        { person: 'Rahul', amountPaise: rs('700') },
        { person: 'Anu', amountPaise: rs('300') },
        { person: 'Sara', amountPaise: rs('500') },
      ],
    }
    expect(totalPaid(expense)).toBe(rs('2000'))
    expect(totalOwed(expense)).toBe(rs('2000'))
  })
})

describe('one payer, multiple people owing', () => {
  const expense = makeExpense(
    'Dinner',
    '2000',
    [['Nia', '2000']],
    [
      ['Rahul', '600'],
      ['Anu', '700'],
      ['Sara', '700'],
    ],
  )

  it('balances reflect who paid and who owes', () => {
    expect(balancesByName(expense)).toEqual({
      Nia: rs('2000'),
      Rahul: -rs('600'),
      Anu: -rs('700'),
      Sara: -rs('700'),
    })
  })

  it('sends every owed amount to the payer', () => {
    const settlements = calculateSettlements(expense)
    expect(settlements.length).toBe(3)
    for (const settlement of settlements) {
      expect(settlement.to).toBe('Nia')
    }
    expect(Object.fromEntries(settlements.map((s) => [s.from, s.amountPaise]))).toEqual({
      Anu: rs('700'),
      Sara: rs('700'),
      Rahul: rs('600'),
    })
  })
})

describe('multiple payers', () => {
  const expense = makeExpense(
    'Dinner',
    '2000',
    [
      ['Nia', '1000'],
      ['Rahul', '600'],
      ['Anu', '400'],
      ['Sara', '0'],
    ],
    [
      ['Nia', '500'],
      ['Rahul', '700'],
      ['Anu', '300'],
      ['Sara', '500'],
    ],
  )

  it('balances combine payments and shares per person', () => {
    expect(balancesByName(expense)).toEqual({
      Nia: rs('500'),
      Rahul: -rs('100'),
      Anu: rs('100'),
      Sara: -rs('500'),
    })
  })

  it('produces practical transfers between debtors and creditors', () => {
    expect(calculateSettlements(expense)).toEqual([
      { from: 'Sara', to: 'Nia', amountPaise: rs('500') },
      { from: 'Rahul', to: 'Anu', amountPaise: rs('100') },
    ])
  })
})

describe('uneven shares', () => {
  const expense = makeExpense(
    'Groceries',
    '1000',
    [['Nia', '1000']],
    [
      ['Nia', '100'],
      ['Rahul', '650'],
      ['Anu', '250'],
    ],
  )

  it('honours custom share amounts', () => {
    expect(totalOwed(expense)).toBe(rs('1000'))
    expect(balancesByName(expense)).toEqual({
      Nia: rs('900'),
      Rahul: -rs('650'),
      Anu: -rs('250'),
    })
  })

  it('settles each person according to their custom share', () => {
    const settlements = calculateSettlements(expense)
    const ledger = applySettlements(calculateBalances(expense), settlements)
    for (const value of Object.values(ledger)) {
      expect(value).toBe(0)
    }
  })
})

describe('zero balances', () => {
  const expense: Expense = {
    description: 'Cab',
    totalPaise: rs('1000'),
    payments: [
      { person: 'Nia', amountPaise: rs('1000') },
      { person: 'Anu', amountPaise: rs('0') },
    ],
    shares: [
      { person: 'Nia', amountPaise: rs('500') },
      { person: 'Rahul', amountPaise: rs('500') },
      { person: 'Anu', amountPaise: rs('0') },
    ],
  }

  it('lists settled people with a zero balance', () => {
    expect(balancesByName(expense)).toEqual({
      Nia: rs('500'),
      Anu: 0,
      Rahul: -rs('500'),
    })
  })

  it('excludes zero-balance people from settlements', () => {
    const settlements = calculateSettlements(expense)
    expect(settlements).toEqual([{ from: 'Rahul', to: 'Nia', amountPaise: rs('500') }])
  })
})

describe('multiple creditors and debtors', () => {
  const expense = makeExpense(
    'Trip',
    '2000',
    [
      ['Nia', '1200'],
      ['Rahul', '800'],
    ],
    [
      ['Nia', '500'],
      ['Rahul', '500'],
      ['Anu', '500'],
      ['Sara', '500'],
    ],
  )

  it('identifies multiple creditors', () => {
    const creditors = calculateBalances(expense)
      .filter((balance) => balance.balancePaise > 0)
      .map((balance) => balance.person)
    expect(creditors.sort()).toEqual(['Nia', 'Rahul'])
  })

  it('identifies multiple debtors', () => {
    const debtors = calculateBalances(expense)
      .filter((balance) => balance.balancePaise < 0)
      .map((balance) => balance.person)
    expect(debtors.sort()).toEqual(['Anu', 'Sara'])
  })

  it('settles every balance with no self-transfers', () => {
    const settlements = calculateSettlements(expense)
    for (const settlement of settlements) {
      expect(settlement.from).not.toBe(settlement.to)
    }
    const ledger = applySettlements(calculateBalances(expense), settlements)
    for (const value of Object.values(ledger)) {
      expect(value).toBe(0)
    }
    expect(settlements.reduce((sum, s) => sum + s.amountPaise, 0)).toBe(rs('1000'))
  })
})