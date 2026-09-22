import type { Paise } from '../domain/money'
import { validateExpense } from '../domain/expense.schema'
import type { Id } from './id'
import { newId } from './id'
import type { Group } from './group'
import { getPersonById } from './group'
import { toDomainExpense } from './toDomain'

export interface Payment {
  id: Id
  personId: Id
  amountPaise: Paise
}

export interface Share {
  id: Id
  personId: Id
  amountPaise: Paise
}

export interface ExpenseRecord {
  id: Id
  description: string
  totalPaise: Paise
  payments: Payment[]
  shares: Share[]
}

export interface NewExpenseInput {
  description: string
  totalPaise: Paise
  payments: Array<{ personId: Id; amountPaise: Paise }>
  shares: Array<{ personId: Id; amountPaise: Paise }>
}

export type RecordExpenseResult =
  | { ok: true; group: Group; expense: ExpenseRecord }
  | { ok: false; errors: string[] }

export type RemoveExpenseResult = { ok: true; group: Group } | { ok: false; errors: string[] }

export function getExpenseById(group: Group, expenseId: Id): ExpenseRecord | undefined {
  return group.expenses.find((expense) => expense.id === expenseId)
}

export function recordExpense(group: Group, input: NewExpenseInput): RecordExpenseResult {
  const unknownIds = new Set<Id>()
  const personExists = (personId: Id): boolean => {
    const known = getPersonById(group, personId) !== undefined
    if (!known) {
      unknownIds.add(personId)
    }
    return known
  }
  input.payments.forEach((payment) => personExists(payment.personId))
  input.shares.forEach((share) => personExists(share.personId))
  if (unknownIds.size > 0) {
    return { ok: false, errors: [`Unknown person id(s): ${[...unknownIds].join(', ')}`] }
  }

  const expense: ExpenseRecord = {
    id: newId(),
    description: input.description.trim(),
    totalPaise: input.totalPaise,
    payments: input.payments.map((payment) => ({
      id: newId(),
      personId: payment.personId,
      amountPaise: payment.amountPaise,
    })),
    shares: input.shares.map((share) => ({
      id: newId(),
      personId: share.personId,
      amountPaise: share.amountPaise,
    })),
  }

  const resolved = toDomainExpense(group, expense)
  if (!resolved.ok) {
    return { ok: false, errors: resolved.errors }
  }
  const validation = validateExpense(resolved.expense)
  if (!validation.ok) {
    return { ok: false, errors: validation.errors }
  }
  return { ok: true, group: { ...group, expenses: [...group.expenses, expense] }, expense }
}

export function removeExpense(group: Group, expenseId: Id): RemoveExpenseResult {
  const existing = getExpenseById(group, expenseId)
  if (!existing) {
    return { ok: false, errors: [`No expense with id "${expenseId}" was found in this group.`] }
  }
  return {
    ok: true,
    group: { ...group, expenses: group.expenses.filter((expense) => expense.id !== expenseId) },
  }
}
