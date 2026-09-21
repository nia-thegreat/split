import { describe, expect, it } from 'vitest'
import { validateExpense } from './expense.schema'
import { rupeesToPaise as rs } from './money'

function validExpense() {
  return {
    description: 'Dinner',
    totalPaise: rs('2000'),
    payments: [
      { person: 'Nia', amountPaise: rs('1000') },
      { person: 'Rahul', amountPaise: rs('600') },
      { person: 'Anu', amountPaise: rs('400') },
    ],
    shares: [
      { person: 'Nia', amountPaise: rs('500') },
      { person: 'Rahul', amountPaise: rs('700') },
      { person: 'Anu', amountPaise: rs('300') },
      { person: 'Sara', amountPaise: rs('500') },
    ],
  }
}

function errorsOf(input: unknown): string[] {
  const result = validateExpense(input)
  if (result.ok) throw new Error('Expected validation to fail, but it succeeded.')
  return result.errors
}

describe('validateExpense', () => {
  it('accepts a valid expense', () => {
    const result = validateExpense(validExpense())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.expense.description).toBe('Dinner')
      expect(result.expense.totalPaise).toBe(rs('2000'))
    }
  })

  it('rejects when payments do not match the total', () => {
    const input = validExpense()
    input.payments[0].amountPaise = rs('800')
    expect(errorsOf(input).join(' ')).toContain('Total paid')
  })

  it('rejects when shares do not match the total', () => {
    const input = validExpense()
    input.shares[0].amountPaise = rs('400')
    expect(errorsOf(input).join(' ')).toContain('Total owed')
  })

  it('rejects negative payment amounts', () => {
    const input = validExpense()
    input.payments[0].amountPaise = -rs('100')
    expect(errorsOf(input).join(' ')).toContain('must not be negative')
  })

  it('rejects negative share amounts', () => {
    const input = validExpense()
    input.shares[0].amountPaise = -rs('100')
    expect(errorsOf(input).join(' ')).toContain('must not be negative')
  })

  it('rejects a negative total', () => {
    const input = validExpense()
    input.totalPaise = -rs('10')
    expect(errorsOf(input).join(' ')).toContain('positive')
  })

  it('rejects a zero total', () => {
    const input = validExpense()
    input.totalPaise = 0
    expect(errorsOf(input).join(' ')).toContain('positive')
  })

  it('rejects fractional paise amounts', () => {
    const input = validExpense()
    input.payments[0].amountPaise = 100.5
    expect(errorsOf(input).join(' ')).toContain('whole number of paise')
  })

  it('rejects a blank person name', () => {
    const input = validExpense()
    input.payments[0].person = '   '
    expect(errorsOf(input).join(' ')).toContain('Person name is required')
  })

  it('rejects a blank description', () => {
    const input = validExpense()
    input.description = '   '
    expect(errorsOf(input).join(' ')).toContain('Description is required')
  })

  it('rejects missing payments', () => {
    const input = validExpense()
    input.payments = []
    expect(errorsOf(input).join(' ')).toContain('At least one payment is required')
  })

  it('accepts a zero-rupee payment', () => {
    const input = validExpense()
    input.payments.push({ person: 'Sara', amountPaise: rs('0') })
    expect(validateExpense(input).ok).toBe(true)
  })
})