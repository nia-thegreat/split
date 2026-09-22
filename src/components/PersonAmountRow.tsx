import type { Person } from '../model/group'
import type { Id } from '../model/id'
import { Button } from './Button'
import { TextField } from './TextField'

interface PersonAmountRowProps {
  people: Person[]
  personId: Id
  amount: string
  error?: string | null
  removeLabel: string
  onPersonChange: (personId: Id) => void
  onAmountChange: (amount: string) => void
  onRemove: () => void
}

export function PersonAmountRow({
  people,
  personId,
  amount,
  error,
  removeLabel,
  onPersonChange,
  onAmountChange,
  onRemove,
}: PersonAmountRowProps) {
  return (
    <div className="flex items-start gap-2">
      <select
        value={personId}
        onChange={(event) => onPersonChange(event.target.value)}
        className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600"
        aria-label="Person"
      >
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
      <div className="w-32 shrink-0">
        <TextField
          inputMode="decimal"
          placeholder="0.00"
          aria-label="Amount in rupees"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          error={error}
          className="h-10"
        />
      </div>
      <Button
        variant="danger"
        aria-label={removeLabel}
        onClick={onRemove}
        className="h-10 shrink-0 px-2.5"
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
    </div>
  )
}