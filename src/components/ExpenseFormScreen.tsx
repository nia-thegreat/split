import { useState } from 'react'
import type { FormEvent } from 'react'
import { paiseToRupees, rupeesToPaise, splitEvenly } from '../domain/money'
import type { Paise } from '../domain/money'
import type { ExpenseRecord, NewExpenseInput } from '../model/expense'
import type { Group, Person } from '../model/group'
import type { Id } from '../model/id'
import { newId } from '../model/id'
import { Button } from './Button'
import { PersonAmountRow } from './PersonAmountRow'
import { TextField } from './TextField'

export type ExpenseMutationResult = { ok: true } | { ok: false; errors: string[] }

interface ExpenseFormScreenProps {
  group: Group
  initialExpense?: ExpenseRecord
  onSave: (input: NewExpenseInput) => ExpenseMutationResult
  onCancel: () => void
}

interface RowDraft {
  id: Id
  personId: Id
  amount: string
}

function rowFromPayment(payment: { personId: Id; amountPaise: Paise }): RowDraft {
  return { id: newId(), personId: payment.personId, amount: paiseToRupees(payment.amountPaise) }
}

function firstRow(people: Person[]): RowDraft {
  const personId = people[0]?.id ?? ''
  return { id: newId(), personId, amount: '' }
}

function nextUnusedPerson(people: Person[], rows: RowDraft[]): Person {
  return people.find((person) => !rows.some((row) => row.personId === person.id)) ?? people[0]
}

interface RunningTotalProps {
  label: string
  currentPaise: Paise
  targetPaise: Paise | null
  ok: boolean
  hint: string
}

function RunningTotal({ label, currentPaise, targetPaise, ok, hint }: RunningTotalProps) {
  const target = targetPaise !== null ? `₹${paiseToRupees(targetPaise)}` : '—'
  return (
    <p className={`text-xs font-medium ${ok ? 'text-emerald-600' : 'text-red-600'}`}>
      {label} ₹{paiseToRupees(currentPaise)} / {target}
      {!ok ? (
        <span className="ml-1 font-normal normal-case">· {hint}</span>
      ) : null}
    </p>
  )
}

export function ExpenseFormScreen({ group, initialExpense, onSave, onCancel }: ExpenseFormScreenProps) {
  const [description, setDescription] = useState(initialExpense?.description ?? '')
  const [total, setTotal] = useState(initialExpense ? paiseToRupees(initialExpense.totalPaise) : '')
  const [payments, setPayments] = useState<RowDraft[]>(
    initialExpense ? initialExpense.payments.map(rowFromPayment) : [firstRow(group.people)],
  )
  const [shares, setShares] = useState<RowDraft[]>(
    initialExpense ? initialExpense.shares.map(rowFromPayment) : [],
  )
  const [modelErrors, setModelErrors] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [splitError, setSplitError] = useState<string | null>(null)

  const updateRow = (
    rows: RowDraft[],
    setRows: (next: RowDraft[]) => void,
    rowId: Id,
    patch: Partial<RowDraft>,
  ) => {
    setRows(rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  const removeRow = (rows: RowDraft[], setRows: (next: RowDraft[]) => void, rowId: Id) => {
    setRows(rows.filter((row) => row.id !== rowId))
  }

  const clearFieldError = (key: string) => {
    setFieldErrors((previous) => {
      const next = { ...previous }
      delete next[key]
      return next
    })
  }

  const addPayment = () => {
    setPayments([...payments, { id: newId(), personId: nextUnusedPerson(group.people, payments).id, amount: '' }])
  }

  const parseAmount = (value: string): Paise | null => {
    try {
      return rupeesToPaise(value)
    } catch {
      return null
    }
  }

  const handleAmountChange = (rows: RowDraft[], setRows: (next: RowDraft[]) => void, rowId: Id, amount: string) => {
    updateRow(rows, setRows, rowId, { amount })
    if (amount.trim() !== '' && parseAmount(amount) === null) {
      setFieldErrors((previous) => ({ ...previous, [rowId]: 'Enter a valid amount.' }))
    } else {
      clearFieldError(rowId)
    }
  }

  const toggleSplitPerson = (personId: Id) => {
    const existing = shares.find((row) => row.personId === personId)
    if (existing) {
      removeRow(shares, setShares, existing.id)
    } else {
      setShares([...shares, { id: newId(), personId, amount: '' }])
    }
    setSplitError(null)
  }

  const handleTotalChange = (value: string) => {
    setTotal(value)
    clearFieldError('total')
    if (payments.length === 1) {
      setPayments(payments.map((row) => ({ ...row, amount: value })))
    }
  }

  const handleSplitEqually = () => {
    if (shares.length === 0) {
      setSplitError('Select at least one person to split equally.')
      return
    }
    let totalPaise: Paise
    try {
      totalPaise = rupeesToPaise(total)
    } catch {
      setSplitError('Enter a valid total amount before splitting equally.')
      return
    }
    const amounts = splitEvenly(totalPaise, shares.map((row) => row.personId))
    setShares(
      shares.map((row) => ({ ...row, amount: paiseToRupees(amounts[row.personId] ?? 0) })),
    )
    setSplitError(null)
    setFieldErrors({})
  }

  const totalPaiseValue = parseAmount(total)
  const paidTotalPaise = payments.reduce((sum, row) => sum + (parseAmount(row.amount) ?? 0), 0)
  const shareTotalPaise = shares.reduce((sum, row) => sum + (parseAmount(row.amount) ?? 0), 0)
  const paidAllValid = payments.every((row) => parseAmount(row.amount) !== null)
  const shareAllValid = shares.every((row) => parseAmount(row.amount) !== null)
  const paidMatches = paidAllValid && totalPaiseValue !== null && paidTotalPaise === totalPaiseValue
  const shareMatches = shareAllValid && totalPaiseValue !== null && shareTotalPaise === totalPaiseValue
  const saveReady = paidMatches && shareMatches

  const handleSave = (event: FormEvent) => {
    event.preventDefault()
    const nextFieldErrors: Record<string, string> = {}

    let totalPaise: Paise
    try {
      totalPaise = rupeesToPaise(total)
    } catch {
      totalPaise = 0
      nextFieldErrors.total = 'Enter a valid total amount.'
    }

    const parseAmount = (row: RowDraft): Paise => {
      try {
        return rupeesToPaise(row.amount)
      } catch {
        nextFieldErrors[row.id] = 'Enter a valid amount.'
        return 0
      }
    }

    const paymentAmounts = payments.map(parseAmount)
    const shareAmounts = shares.map(parseAmount)

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setModelErrors([])
      return
    }

    const input: NewExpenseInput = {
      description,
      totalPaise,
      payments: payments.map((row, index) => ({ personId: row.personId, amountPaise: paymentAmounts[index] })),
      shares: shares.map((row, index) => ({ personId: row.personId, amountPaise: shareAmounts[index] })),
    }
    const result = onSave(input)
    if (!result.ok) {
      setModelErrors(result.errors)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold tracking-wide uppercase text-emerald-600">Split</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
          {initialExpense ? 'Edit expense' : 'Add expense'}
        </h1>
        <p className="mt-1 text-neutral-500">{group.name}</p>
      </header>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <TextField
          label="Description"
          placeholder="e.g. Lunch"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          autoFocus
        />

        <TextField
          label="Total amount (₹)"
          placeholder="0.00"
          inputMode="decimal"
          value={total}
          onChange={(event) => handleTotalChange(event.target.value)}
          error={fieldErrors.total}
        />

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-700">Paid by</h2>
            <Button
              variant="secondary"
              onClick={addPayment}
              disabled={payments.length >= group.people.length}
              className="px-3 py-1.5"
            >
              Add payer
            </Button>
          </div>
          <p className="text-sm text-neutral-500">Who actually paid, and how much.</p>
          <ul className="flex flex-col gap-2">
            {payments.map((row) => (
              <li key={row.id}>
                <PersonAmountRow
                  people={group.people}
                  personId={row.personId}
                  amount={row.amount}
                  error={fieldErrors[row.id]}
                  removeLabel="Remove payer"
                  onPersonChange={(personId) => updateRow(payments, setPayments, row.id, { personId })}
                  onAmountChange={(amount) => handleAmountChange(payments, setPayments, row.id, amount)}
                  onRemove={() => removeRow(payments, setPayments, row.id)}
                />
              </li>
            ))}
          </ul>
          <RunningTotal
            label="Paid"
            currentPaise={paidTotalPaise}
            targetPaise={totalPaiseValue}
            ok={paidMatches}
            hint="Paid amount doesn&rsquo;t match the total."
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-neutral-700">Owed by</h2>
          <p className="text-sm text-neutral-500">Who should bear the cost, and their share.</p>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-sm font-medium text-neutral-700">Split between</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.people.map((person) => {
                const selected = shares.some((row) => row.personId === person.id)
                return (
                  <button
                    key={person.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSplitPerson(person.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                      selected
                        ? 'bg-emerald-600 text-white'
                        : 'border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {person.name}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-neutral-500">
                Pick who owes, then split the total across them. Edit any amount for a custom split.
              </p>
              <Button variant="secondary" onClick={handleSplitEqually} className="shrink-0 px-3 py-1.5">
                Split equally
              </Button>
            </div>
            {splitError ? (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {splitError}
              </p>
            ) : null}
          </div>

          <ul className="flex flex-col gap-2">
            {shares.map((row) => (
              <li key={row.id}>
                <PersonAmountRow
                  people={group.people}
                  personId={row.personId}
                  amount={row.amount}
                  error={fieldErrors[row.id]}
                  removeLabel="Remove share"
                  onPersonChange={(personId) => updateRow(shares, setShares, row.id, { personId })}
                  onAmountChange={(amount) => handleAmountChange(shares, setShares, row.id, amount)}
                  onRemove={() => removeRow(shares, setShares, row.id)}
                />
              </li>
            ))}
          </ul>
          <RunningTotal
            label="Shares"
            currentPaise={shareTotalPaise}
            targetPaise={totalPaiseValue}
            ok={shareMatches}
            hint="Shares don&rsquo;t add up to the total."
          />
        </section>

        {modelErrors.length > 0 ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <ul className="list-disc pl-4">
              {modelErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={!saveReady} className="flex-1">
            Save expense
          </Button>
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </main>
  )
}