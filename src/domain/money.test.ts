import { describe, expect, it } from 'vitest'
import { paiseToRupees, rupeesToPaise, splitByWeights, splitEvenly } from './money'

describe('rupeesToPaise', () => {
  it('converts whole rupees to paise', () => {
    expect(rupeesToPaise('2000')).toBe(200000)
  })

  it('converts rupees with one decimal place', () => {
    expect(rupeesToPaise('500.5')).toBe(50050)
  })

  it('converts rupees with two decimal places', () => {
    expect(rupeesToPaise('123.45')).toBe(12345)
  })

  it('accepts numeric input', () => {
    expect(rupeesToPaise(500.05)).toBe(50005)
  })

  it('converts zero', () => {
    expect(rupeesToPaise('0')).toBe(0)
  })

  it('rejects more than two decimal places', () => {
    expect(() => rupeesToPaise('100.123')).toThrow(RangeError)
  })

  it('rejects non-numeric input', () => {
    expect(() => rupeesToPaise('abc')).toThrow(RangeError)
  })

  it('rejects negative input', () => {
    expect(() => rupeesToPaise('-100')).toThrow(RangeError)
  })
})

describe('paiseToRupees', () => {
  it('formats whole rupees with two decimals', () => {
    expect(paiseToRupees(200000)).toBe('2000.00')
  })

  it('formats a paise remainder', () => {
    expect(paiseToRupees(50050)).toBe('500.50')
  })

  it('formats amounts under one rupee', () => {
    expect(paiseToRupees(5)).toBe('0.05')
  })

  it('formats negative balances', () => {
    expect(paiseToRupees(-10000)).toBe('-100.00')
  })
})

describe('splitEvenly', () => {
  it('splits ₹100 across 3 people without losing paise', () => {
    const result = splitEvenly(10000, ['Nia', 'Rahul', 'Anu'])
    expect(Object.values(result).reduce((sum, value) => sum + value, 0)).toBe(10000)
    expect(result).toEqual({ Nia: 3334, Rahul: 3333, Anu: 3333 })
  })

  it('splits exactly divisible amounts without a remainder', () => {
    expect(splitEvenly(10000, ['Nia', 'Rahul', 'Anu', 'Sara'])).toEqual({
      Nia: 2500,
      Rahul: 2500,
      Anu: 2500,
      Sara: 2500,
    })
  })
})

describe('splitByWeights', () => {
  it('allocates proportionally and preserves the total', () => {
    const result = splitByWeights(10000, { Nia: 1, Rahul: 2 })
    expect(Object.values(result).reduce((sum, value) => sum + value, 0)).toBe(10000)
    expect(result).toEqual({ Nia: 3333, Rahul: 6667 })
  })
})