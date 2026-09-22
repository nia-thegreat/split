export type Id = string

export function newId(): Id {
  return crypto.randomUUID()
}
