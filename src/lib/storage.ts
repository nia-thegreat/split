import { z } from 'zod'
import type { Group } from '../model/group'
import { EXPENSE_CATEGORIES } from '../model/expense'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const STORAGE_KEY = 'split.group.v1'

const personSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
})

const amountSchema = z.object({
  id: z.string().min(1),
  personId: z.string().min(1),
  amountPaise: z.number().int().nonnegative(),
})

const expenseSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  category: z.enum(EXPENSE_CATEGORIES).default('Other'),
  totalPaise: z.number().int().nonnegative(),
  payments: z.array(amountSchema),
  shares: z.array(amountSchema),
})

const groupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  people: z.array(personSchema),
  expenses: z.array(expenseSchema),
})

const defaultStorage: StorageLike | null = typeof localStorage !== 'undefined' ? localStorage : null

function resolveStorage(storage?: StorageLike): StorageLike | null {
  return storage ?? defaultStorage
}

function safeRemove(storage: StorageLike): void {
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore read/removal failures; the app falls back to empty state.
  }
}

export function loadGroup(storage?: StorageLike): Group | null {
  const store = resolveStorage(storage)
  if (!store) {
    return null
  }

  let raw: string | null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    safeRemove(store)
    return null
  }

  const result = groupSchema.safeParse(parsed)
  if (!result.success) {
    safeRemove(store)
    return null
  }
  return result.data
}

export function saveGroup(group: Group, storage?: StorageLike): void {
  const store = resolveStorage(storage)
  if (!store) {
    return
  }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(group))
  } catch {
    // Ignore write failures (e.g. quota exceeded); the app stays functional.
  }
}

export function clearGroup(storage?: StorageLike): void {
  const store = resolveStorage(storage)
  if (store) {
    safeRemove(store)
  }
}