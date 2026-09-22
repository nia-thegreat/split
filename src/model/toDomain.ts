import type { Expense as DomainExpense } from '../domain/expense'
import { validateExpense } from '../domain/expense.schema'
import type { ExpenseRecord } from './expense'
import type { Group } from './group'

export type ToDomainExpenseResult =
  | { ok: true; expense: DomainExpense }
  | { ok: false; errors: string[] }

export function toDomainExpense(group: Group, record: ExpenseRecord): ToDomainExpenseResult {
  const nameById = new Map(group.people.map((person) => [person.id, person.name]))
  const invalidIds = new Set<string>()
  const personName = (personId: string): string => {
    const name = nameById.get(personId)
    if (name === undefined) {
      invalidIds.add(personId)
    }
    return name ?? personId
  }
  const expense: DomainExpense = {
    description: record.description,
    totalPaise: record.totalPaise,
    payments: record.payments.map(({ personId, amountPaise }) => ({
      person: personName(personId),
      amountPaise,
    })),
    shares: record.shares.map(({ personId, amountPaise }) => ({
      person: personName(personId),
      amountPaise,
    })),
  }
  if (invalidIds.size > 0) {
    return { ok: false, errors: [`Unknown person id(s): ${[...invalidIds].join(', ')}`] }
  }
  const validation = validateExpense(expense)
  if (!validation.ok) {
    return { ok: false, errors: validation.errors }
  }
  return { ok: true, expense }
}
