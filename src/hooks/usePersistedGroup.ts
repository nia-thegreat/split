import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { clearGroup, loadGroup, saveGroup } from '../lib/storage'
import type { StorageLike } from '../lib/storage'
import type { Group } from '../model/group'

export function resetGroup(
  storage: StorageLike | undefined,
  setGroup: Dispatch<SetStateAction<Group | null>>,
): void {
  clearGroup(storage)
  setGroup(null)
}

export function usePersistedGroup(storage?: StorageLike): {
  group: Group | null
  setGroup: Dispatch<SetStateAction<Group | null>>
  reset: () => void
} {
  const [group, setGroup] = useState<Group | null>(() => loadGroup(storage))

  useEffect(() => {
    if (group) {
      saveGroup(group, storage)
    }
  }, [group, storage])

  return { group, setGroup, reset: () => resetGroup(storage, setGroup) }
}