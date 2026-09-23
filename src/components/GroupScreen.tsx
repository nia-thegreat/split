import { useState } from 'react'
import { paiseToRupees } from '../domain/money'
import type { ExpenseRecord } from '../model/expense'
import type { Group } from '../model/group'
import type { Id } from '../model/id'
import { getPersonById } from '../model/group'
import { Button } from './Button'
import { SettlementSections } from './SettlementSections'

interface GroupScreenProps {
  group: Group
  onAddExpense: () => void
  onEditExpense: (expenseId: Id) => void
  onRemoveExpense: (expenseId: Id) => void
  onReset: () => void
}

function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toUpperCase()
}

function pluralise(count: number): string {
  return count === 1 ? 'person' : 'people'
}

function payersLabel(group: Group, expense: ExpenseRecord): string {
  return expense.payments
    .map((payment) => getPersonById(group, payment.personId)?.name ?? 'Someone')
    .join(', ')
}

export function GroupScreen({ group, onAddExpense, onEditExpense, onRemoveExpense, onReset }: GroupScreenProps) {
  const [confirmingReset, setConfirmingReset] = useState(false)

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <header className="mb-8 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold tracking-wide uppercase text-emerald-600">Split</p>
        <Button variant="secondary" onClick={() => setConfirmingReset(true)} className="px-3 py-1.5">
          New group
        </Button>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-emerald-50 p-6">
        <h1 className="text-2xl font-semibold text-neutral-900">{group.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {group.people.length} {pluralise(group.people.length)}
        </p>
      </div>

      {confirmingReset ? (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-semibold text-neutral-900">Start a new group?</p>
          <p className="mt-1 text-sm text-neutral-500">
            This clears the current group and all its expenses. This can&rsquo;t be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => setConfirmingReset(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="button" onClick={onReset} className="flex-1">
              Start new group
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <SettlementSections group={group} />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-neutral-700">Expenses</h2>
        <Button onClick={onAddExpense} className="px-3 py-1.5">
          Add expense
        </Button>
      </div>
      {group.expenses.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400">No expenses yet. Add the first one.</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
          {group.expenses.map((expense) => (
            <li key={expense.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-neutral-900">{expense.description}</p>
                <p className="truncate text-sm text-neutral-500">
                  ₹{paiseToRupees(expense.totalPaise)} · Paid by {payersLabel(group, expense)}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => onEditExpense(expense.id)}
                className="shrink-0 px-3 py-1.5"
              >
                Edit
              </Button>
              <Button
                variant="danger"
                aria-label={`Remove ${expense.description}`}
                onClick={() => onRemoveExpense(expense.id)}
                className="shrink-0 px-2.5 py-1.5"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                  className="h-4 w-4"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94z" />
                </svg>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-medium text-neutral-700">People</h2>
      {group.people.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400">This group has no people yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
          {group.people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                {initialsOf(person.name)}
              </span>
              <span className="min-w-0 flex-1 truncate text-neutral-900">{person.name}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}