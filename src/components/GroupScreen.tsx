import type { Group } from '../model/group'

interface GroupScreenProps {
  group: Group
}

function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toUpperCase()
}

function pluralise(count: number): string {
  return count === 1 ? 'person' : 'people'
}

export function GroupScreen({ group }: GroupScreenProps) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold tracking-wide uppercase text-emerald-600">Split</p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-emerald-50 p-6">
        <h1 className="text-2xl font-semibold text-neutral-900">{group.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {group.people.length} {pluralise(group.people.length)}
        </p>
      </div>

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