import { useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { addPerson, createGroup, removePerson } from '../model/group'
import type { Group, Person } from '../model/group'
import type { Id } from '../model/id'
import { Button } from './Button'
import { TextField } from './TextField'

interface GroupSetupScreenProps {
  onCreate: (group: Group) => void
}

function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toUpperCase()
}

export function GroupSetupScreen({ onCreate }: GroupSetupScreenProps) {
  const [groupName, setGroupName] = useState('')
  const [personInput, setPersonInput] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [groupError, setGroupError] = useState<string | null>(null)
  const [personError, setPersonError] = useState<string | null>(null)
  const personInputRef = useRef<HTMLInputElement>(null)

  const draftGroup = (): Group => ({ id: 'draft', name: groupName, people, expenses: [] })

  const handleAddPerson = () => {
    const result = addPerson(draftGroup(), personInput)
    if (result.ok) {
      setPeople(result.group.people)
      setPersonInput('')
      setPersonError(null)
      personInputRef.current?.focus()
    } else {
      setPersonError(result.errors[0] ?? 'Something went wrong.')
    }
  }

  const handleAddKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddPerson()
    }
  }

  const handleRemovePerson = (personId: Id) => {
    const result = removePerson(draftGroup(), personId)
    if (result.ok) {
      setPeople(result.group.people)
    }
  }

  const handleCreate = (event: FormEvent) => {
    event.preventDefault()
    if (people.length === 0) {
      return
    }
    const result = createGroup(groupName, people.map((person) => person.name))
    if (result.ok) {
      onCreate(result.group)
    } else {
      setGroupError(result.errors[0] ?? 'Something went wrong.')
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold tracking-wide uppercase text-emerald-600">Split</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Create a group</h1>
        <p className="mt-1 text-neutral-500">Add who is in on this, and start splitting costs together.</p>
      </header>

      <form onSubmit={handleCreate} className="flex flex-col gap-6">
        <TextField
          label="Group name"
          placeholder="e.g. Dinner with friends"
          value={groupName}
          onChange={(event) => {
            setGroupName(event.target.value)
            setGroupError(null)
          }}
          error={groupError}
          autoFocus
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                ref={personInputRef}
                label="Who's in the group?"
                placeholder="Person name"
                value={personInput}
                onChange={(event) => {
                  setPersonInput(event.target.value)
                  setPersonError(null)
                }}
                onKeyDown={handleAddKeyDown}
                error={personError}
              />
            </div>
            <Button onClick={handleAddPerson} className="shrink-0">
              Add Person
            </Button>
          </div>

          {people.length === 0 ? (
            <p className="text-sm text-neutral-400">No one added yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
              {people.map((person) => (
                <li key={person.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                    {initialsOf(person.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-neutral-900">{person.name}</span>
                  <Button
                    variant="danger"
                    aria-label={`Remove ${person.name}`}
                    onClick={() => handleRemovePerson(person.id)}
                    className="shrink-0 px-2 py-2"
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
        </div>

        <Button type="submit" disabled={people.length === 0}>
          Create group
        </Button>
      </form>
    </main>
  )
}