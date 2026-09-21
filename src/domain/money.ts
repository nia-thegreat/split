export type Paise = number

const PAISE_PER_RUPEE = 100

export function rupeesToPaise(input: string | number): Paise {
  const raw = typeof input === 'number' ? String(input) : input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new RangeError(
      `Invalid rupees amount "${input}": expected a non-negative amount with at most 2 decimal places.`,
    )
  }
  const [rupees, paise = ''] = raw.split('.')
  return Number(rupees) * PAISE_PER_RUPEE + Number(paise.padEnd(2, '0'))
}

export function paiseToRupees(paise: Paise): string {
  if (!Number.isInteger(paise)) {
    throw new RangeError(`Invalid paise value ${paise}: expected an integer.`)
  }
  const sign = paise < 0 ? '-' : ''
  const absolute = Math.abs(paise)
  const rupees = Math.floor(absolute / PAISE_PER_RUPEE)
  const remainder = absolute % PAISE_PER_RUPEE
  return `${sign}${rupees}.${String(remainder).padStart(2, '0')}`
}

function distributeRemainder(total: Paise, weights: number[]): number[] {
  if (!Number.isInteger(total) || total < 0) {
    throw new RangeError(`Invalid total ${total}: expected a non-negative integer.`)
  }
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight <= 0) {
    throw new RangeError('Splitting requires at least one positive weight.')
  }
  const exact = weights.map((weight) => (total * weight) / totalWeight)
  const amounts = exact.map((value) => Math.floor(value))
  let allocated = amounts.reduce((sum, value) => sum + value, 0)
  const byLargestFraction = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
  let cursor = 0
  while (allocated < total) {
    amounts[byLargestFraction[cursor % byLargestFraction.length].index] += 1
    allocated += 1
    cursor += 1
  }
  return amounts
}

export function splitEvenly(totalPaise: Paise, people: string[]): Record<string, Paise> {
  if (people.length === 0) {
    throw new RangeError('Splitting evenly requires at least one person.')
  }
  const amounts = distributeRemainder(totalPaise, people.map(() => 1))
  return Object.fromEntries(people.map((person, index) => [person, amounts[index]]))
}

export function splitByWeights(totalPaise: Paise, weights: Record<string, number>): Record<string, Paise> {
  const entries = Object.entries(weights)
  if (entries.length === 0) {
    throw new RangeError('Splitting by weights requires at least one person.')
  }
  for (const [person, weight] of entries) {
    if (!(weight > 0)) {
      throw new RangeError(`Weight for "${person}" must be positive, got ${weight}.`)
    }
  }
  const amounts = distributeRemainder(totalPaise, entries.map(([, weight]) => weight))
  return Object.fromEntries(entries.map(([person], index) => [person, amounts[index]]))
}