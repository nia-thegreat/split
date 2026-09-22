import { useState } from 'react'
import type { NewExpenseInput } from './model/expense'
import { getExpenseById, recordExpense, removeExpense, updateExpense } from './model/expense'
import type { Group } from './model/group'
import type { Id } from './model/id'
import { ExpenseFormScreen } from './components/ExpenseFormScreen'
import type { ExpenseMutationResult } from './components/ExpenseFormScreen'
import { GroupScreen } from './components/GroupScreen'
import { GroupSetupScreen } from './components/GroupSetupScreen'

type ExpenseFormState = { mode: 'create' } | { mode: 'edit'; expenseId: Id }

function App() {
  const [group, setGroup] = useState<Group | null>(null)
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState | null>(null)

  const handleSaveExpense = (input: NewExpenseInput): ExpenseMutationResult => {
    if (!group) {
      return { ok: false, errors: ['No group is set.'] }
    }
    const result = recordExpense(group, input)
    if (!result.ok) {
      return result
    }
    setGroup(result.group)
    setExpenseForm(null)
    return { ok: true }
  }

  const handleUpdateExpense = (expenseId: Id, input: NewExpenseInput): ExpenseMutationResult => {
    if (!group) {
      return { ok: false, errors: ['No group is set.'] }
    }
    const result = updateExpense(group, expenseId, input)
    if (!result.ok) {
      return result
    }
    setGroup(result.group)
    setExpenseForm(null)
    return { ok: true }
  }

  const handleRemoveExpense = (expenseId: Id) => {
    if (!group) {
      return
    }
    const result = removeExpense(group, expenseId)
    if (result.ok) {
      setGroup(result.group)
    }
  }

  const handleSave = (input: NewExpenseInput): ExpenseMutationResult => {
    if (expenseForm?.mode === 'edit') {
      return handleUpdateExpense(expenseForm.expenseId, input)
    }
    return handleSaveExpense(input)
  }

  if (!group) {
    return (
      <div className="flex min-h-svh flex-col">
        <GroupSetupScreen onCreate={setGroup} />
      </div>
    )
  }

  if (expenseForm) {
    const initialExpense =
      expenseForm.mode === 'edit' ? getExpenseById(group, expenseForm.expenseId) : undefined
    return (
      <div className="flex min-h-svh flex-col">
        <ExpenseFormScreen
          group={group}
          initialExpense={initialExpense}
          onSave={handleSave}
          onCancel={() => setExpenseForm(null)}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <GroupScreen
        group={group}
        onAddExpense={() => setExpenseForm({ mode: 'create' })}
        onEditExpense={(expenseId) => setExpenseForm({ mode: 'edit', expenseId })}
        onRemoveExpense={handleRemoveExpense}
      />
    </div>
  )
}

export default App