import type { ExpenseRecord } from './expense'
import type { Id } from './id'
import { newId } from './id'

export interface Person {
  id: Id
  name: string
}

export interface Group {
  id: Id
  name: string
  people: Person[]
  expenses: ExpenseRecord[]
}

export type CreateGroupResult = { ok: true; group: Group } | { ok: false; errors: string[] }

export type AddPersonResult = { ok: true; group: Group; person: Person } | { ok: false; errors: string[] }

export type RemovePersonResult = { ok: true; group: Group } | { ok: false; errors: string[] }

export type RenamePersonResult = { ok: true; group: Group } | { ok: false; errors: string[] }

export function createGroup(rawName: string, rawPersonNames: string[] = []): CreateGroupResult {
  const name = rawName.trim()
  if (name.length === 0) {
    return { ok: false, errors: ['Group name is required.'] }
  }
  const people: Person[] = []
  const seen = new Set<string>()
  for (const rawPersonName of rawPersonNames) {
    const personName = rawPersonName.trim()
    if (personName.length === 0) {
      continue
    }
    const key = personName.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    people.push({ id: newId(), name: personName })
  }
  return { ok: true, group: { id: newId(), name, people, expenses: [] } }
}

export function getPersonById(group: Group, personId: Id): Person | undefined {
  return group.people.find((person) => person.id === personId)
}

export function addPerson(group: Group, rawName: string): AddPersonResult {
  const name = rawName.trim()
  if (name.length === 0) {
    return { ok: false, errors: ['Person name is required.'] }
  }
  const duplicate = group.people.some((person) => person.name.toLowerCase() === name.toLowerCase())
  if (duplicate) {
    return { ok: false, errors: [`Person "${name}" is already in this group.`] }
  }
  const person: Person = { id: newId(), name }
  return { ok: true, person, group: { ...group, people: [...group.people, person] } }
}

export function removePerson(group: Group, personId: Id): RemovePersonResult {
  const person = getPersonById(group, personId)
  if (!person) {
    return { ok: false, errors: [`No person with id "${personId}" exists in this group.`] }
  }
  const referenced = group.expenses.some(
    (expense) =>
      expense.payments.some((payment) => payment.personId === personId) ||
      expense.shares.some((share) => share.personId === personId),
  )
  if (referenced) {
    return {
      ok: false,
      errors: [`Cannot remove "${person.name}": they are referenced by an expense.`],
    }
  }
  return {
    ok: true,
    group: { ...group, people: group.people.filter((candidate) => candidate.id !== personId) },
  }
}

export function renamePerson(group: Group, personId: Id, rawName: string): RenamePersonResult {
  const name = rawName.trim()
  if (name.length === 0) {
    return { ok: false, errors: ['Person name is required.'] }
  }
  const duplicate = group.people.some(
    (person) => person.id !== personId && person.name.toLowerCase() === name.toLowerCase(),
  )
  if (duplicate) {
    return { ok: false, errors: [`Person "${name}" is already in this group.`] }
  }
  return {
    ok: true,
    group: {
      ...group,
      people: group.people.map((person) => (person.id === personId ? { ...person, name } : person)),
    },
  }
}
