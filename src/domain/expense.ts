import type { Paise } from './money'

export interface Payment {
  person: string
  amountPaise: Paise
}

export interface Share {
  person: string
  amountPaise: Paise
}

export interface Expense {
  description: string
  totalPaise: Paise
  payments: Payment[]
  shares: Share[]
}

export interface Balance {
  person: string
  balancePaise: Paise
}

export interface Settlement {
  from: string
  to: string
  amountPaise: Paise
}

export function totalPaid(expense: Expense): Paise {
  return expense.payments.reduce((sum, payment) => sum + payment.amountPaise, 0)
}

export function totalOwed(expense: Expense): Paise {
  return expense.shares.reduce((sum, share) => sum + share.amountPaise, 0)
}

export function calculateBalances(expense: Expense): Balance[] {
  const balances = new Map<string, Paise>()
  for (const payment of expense.payments) {
    balances.set(payment.person, (balances.get(payment.person) ?? 0) + payment.amountPaise)
  }
  for (const share of expense.shares) {
    balances.set(share.person, (balances.get(share.person) ?? 0) - share.amountPaise)
  }
  return Array.from(balances, ([person, balancePaise]) => ({ person, balancePaise }))
}

export function aggregateBalances(expenses: Expense[]): Balance[] {
  const balances = new Map<string, Paise>()
  for (const expense of expenses) {
    for (const { person, balancePaise } of calculateBalances(expense)) {
      balances.set(person, (balances.get(person) ?? 0) + balancePaise)
    }
  }
  return Array.from(balances, ([person, balancePaise]) => ({ person, balancePaise }))
}

export function settlementsFromBalances(balances: Balance[]): Settlement[] {
  const deficits = new Map<string, Paise>()
  const surpluses = new Map<string, Paise>()
  for (const { person, balancePaise } of balances) {
    if (balancePaise > 0) surpluses.set(person, balancePaise)
    if (balancePaise < 0) deficits.set(person, -balancePaise)
  }

  const debtors = Array.from(deficits).sort((a, b) => b[1] - a[1])
  const creditors = Array.from(surpluses).sort((a, b) => b[1] - a[1])

  const settlements: Settlement[] = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const amount = Math.min(debtor[1], creditor[1])
    settlements.push({ from: debtor[0], to: creditor[0], amountPaise: amount })
    debtor[1] -= amount
    creditor[1] -= amount
    if (debtor[1] === 0) debtorIndex += 1
    if (creditor[1] === 0) creditorIndex += 1
  }

  return settlements
}

export function calculateSettlements(expense: Expense): Settlement[] {
  return settlementsFromBalances(calculateBalances(expense))
}