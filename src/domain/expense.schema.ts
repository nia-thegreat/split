import { z } from 'zod'
import type { Expense } from './expense'
import { paiseToRupees } from './money'

const amountPaise = z
  .number()
  .int('Amount must be a whole number of paise.')
  .nonnegative('Amount must not be negative.')

const paymentSchema = z.object({
  person: z.string().trim().min(1, 'Person name is required.'),
  amountPaise,
})

const shareSchema = z.object({
  person: z.string().trim().min(1, 'Person name is required.'),
  amountPaise,
})

export const expenseSchema: z.ZodType<Expense> = z
  .object({
    description: z.string().trim().min(1, 'Description is required.'),
    totalPaise: z
      .number()
      .int('Total must be a whole number of paise.')
      .positive('Total must be a positive amount.'),
    payments: z.array(paymentSchema).min(1, 'At least one payment is required.'),
    shares: z.array(shareSchema).min(1, 'At least one share is required.'),
  })
  .superRefine((expense, context) => {
    const paid = expense.payments.reduce((sum, payment) => sum + payment.amountPaise, 0)
    if (paid !== expense.totalPaise) {
      context.addIssue({
        code: 'custom',
        path: ['payments'],
        message: `Total paid (₹${paiseToRupees(paid)}) does not match the expense total (₹${paiseToRupees(expense.totalPaise)}).`,
      })
    }
    const owed = expense.shares.reduce((sum, share) => sum + share.amountPaise, 0)
    if (owed !== expense.totalPaise) {
      context.addIssue({
        code: 'custom',
        path: ['shares'],
        message: `Total owed (₹${paiseToRupees(owed)}) does not match the expense total (₹${paiseToRupees(expense.totalPaise)}).`,
      })
    }
  })

export type ValidationResult =
  | { ok: true; expense: Expense }
  | { ok: false; errors: string[] }

export function validateExpense(input: unknown): ValidationResult {
  const result = expenseSchema.safeParse(input)
  if (result.success) {
    return { ok: true, expense: result.data }
  }
  const errors = result.error.issues.map((issue) => {
    const location = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
    return `${location}${issue.message}`
  })
  return { ok: false, errors }
}