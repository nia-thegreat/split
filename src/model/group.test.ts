import { describe, expect, it } from 'vitest'
import { rupeesToPaise as rs } from '../domain/money'
import { recordExpense } from './expense'
import { addPerson, createGroup, getPersonById, removePerson, renamePerson } from './group'

describe('createGroup', () => {
  it('creates a group with a trimmed name', () => {
    const result = createGroup('  Dinner  ')
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.group.name).toBe('Dinner')
    expect(result.group.people).toHaveLength(0)
    expect(result.group.expenses).toHaveLength(0)
    expect(result.group.id.length).toBeGreaterThan(0)
  })

  it('creates people from the provided names, trimming and de-duplicating case-insensitively', () => {
    const result = createGroup('Dinner', ['  Nia  ', 'Rahul', 'NIA', '', '  Anu '])
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.group.people.map((person) => person.name)).toEqual(['Nia', 'Rahul', 'Anu'])
  })

  it('rejects a blank group name', () => {
    const result = createGroup('   ')
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors).toContain('Group name is required.')
  })
})

describe('addPerson', () => {
  it('adds a person to the group', () => {
    const created = createGroup('Dinner', ['Nia'])
    if (!created.ok) {
      throw new Error('expected a valid group')
    }
    const result = addPerson(created.group, '  Rahul  ')
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.person.name).toBe('Rahul')
    expect(result.group.people).toHaveLength(2)
    expect(result.group).not.toBe(created.group)
  })

  it('rejects an empty person name', () => {
    const created = createGroup('Dinner')
    if (!created.ok) {
      throw new Error('expected a valid group')
    }
    const result = addPerson(created.group, '   ')
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors).toContain('Person name is required.')
  })

  it('rejects a duplicate name case-insensitively', () => {
    const created = createGroup('Dinner', ['Nia'])
    if (!created.ok) {
      throw new Error('expected a valid group')
    }
    const result = addPerson(created.group, ' nia ')
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors).toContain('Person "nia" is already in this group.')
  })
})

describe('getPersonById', () => {
  it('returns the matching person or undefined', () => {
    const created = createGroup('Dinner', ['Nia', 'Rahul'])
    if (!created.ok) {
      throw new Error('expected a valid group')
    }
    const nia = created.group.people[0]
    expect(getPersonById(created.group, nia.id)?.name).toBe('Nia')
    expect(getPersonById(created.group, 'missing-id')).toBeUndefined()
  })
})

describe('renamePerson', () => {
  it('renames a person', () => {
    const created = createGroup('Dinner', ['Nia'])
    if (!created.ok) {
      throw new Error('expected a valid group')
    }
    const result = renamePerson(created.group, created.group.people[0].id, '  Nia Shah  ')
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.group.people[0].name).toBe('Nia Shah')
  })

  it('rejects renaming to an empty name', () => {
    const created = createGroup('Dinner', ['Nia'])
    if (!created.ok) {
      throw new Error('expected a valid group')
    }
    const result = renamePerson(created.group, created.group.people[0].id, '   ')
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors).toContain('Person name is required.')
  })

  it('rejects renaming to a case-insensitive duplicate', () => {
    const created = createGroup('Dinner', ['Nia', 'Rahul'])
    if (!created.ok) {
      throw new Error('expected a valid group')
    }
    const result = renamePerson(created.group, created.group.people[0].id, 'RAHUL')
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors).toContain('Person "RAHUL" is already in this group.')
  })
})

describe('removePerson', () => {
  it('removes a person who is not referenced by an expense', () => {
    const created = createGroup('Dinner', ['Nia', 'Rahul', 'Anu'])
    if (!created.ok) {
      throw new Error('expected a valid group')
    }
    const result = removePerson(created.group, created.group.people[1].id)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.group.people.map((person) => person.name)).toEqual(['Nia', 'Anu'])
  })

  it('rejects removing a person who is referenced by an expense', () => {
    const created = createGroup('Dinner', ['Nia', 'Rahul'])
    if (!created.ok) {
      throw new Error('expected a valid group')
    }
    const nia = created.group.people[0]
    const recorded = recordExpense(created.group, {
      description: 'Dinner',
      totalPaise: rs('1000'),
      payments: [{ personId: nia.id, amountPaise: rs('1000') }],
      shares: [
        { personId: nia.id, amountPaise: rs('500') },
        { personId: created.group.people[1].id, amountPaise: rs('500') },
      ],
    })
    if (!recorded.ok) {
      throw new Error('expected a valid expense')
    }
    const result = removePerson(recorded.group, nia.id)
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors).toContain('Cannot remove "Nia": they are referenced by an expense.')
  })

  it('rejects removing a person id that does not exist', () => {
    const created = createGroup('Dinner', ['Nia'])
    if (!created.ok) {
      throw new Error('expected a valid group')
    }
    const result = removePerson(created.group, 'missing-id')
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.errors).toHaveLength(1)
  })
})
