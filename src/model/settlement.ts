import { aggregateBalances, settlementsFromBalances } from '../domain/expense'
import type { Expense as DomainExpense } from '../domain/expense'
import type { Paise } from '../domain/money'
import type { Group } from './group'
import type { Id } from './id'
import { toDomainExpense } from './toDomain'

export interface GroupBalance {
  personId: Id
  name: string
  balancePaise: Paise
}

export interface GroupSettlement {
  fromId: Id
  fromName: string
  toId: Id
  toName: string
  amountPaise: Paise
}

function resolveExpenses(group: Group): DomainExpense[] {
  return group.expenses.map((record) => {
    const resolved = toDomainExpense(group, record)
    if (!resolved.ok) {
      throw new Error(resolved.errors.join('; '))
    }
    return resolved.expense
  })
}

function aggregatedBalances(group: Group) {
  return aggregateBalances(resolveExpenses(group))
}

export function getGroupBalances(group: Group): GroupBalance[] {
  const amountByName = new Map(
    aggregatedBalances(group).map((balance) => [balance.person, balance.balancePaise]),
  )
  return group.people.map((person) => ({
    personId: person.id,
    name: person.name,
    balancePaise: amountByName.get(person.name) ?? 0,
  }))
}

export function getGroupSettlements(group: Group): GroupSettlement[] {
  const personIdByName = new Map(group.people.map((person) => [person.name, person.id]))
  return settlementsFromBalances(aggregatedBalances(group)).map((settlement) => ({
    fromId: personIdByName.get(settlement.from) ?? settlement.from,
    fromName: settlement.from,
    toId: personIdByName.get(settlement.to) ?? settlement.to,
    toName: settlement.to,
    amountPaise: settlement.amountPaise,
  }))
}