import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Group } from '../model/group'
import { loadGroup, saveGroup } from '../lib/storage'

export function usePersistedGroup(): {
  group: Group | null
  setGroup: Dispatch<SetStateAction<Group | null>>
} {
  const [group, setGroup] = useState<Group | null>(() => loadGroup())

  useEffect(() => {
    if (group) {
      saveGroup(group)
    }
  }, [group])

  return { group, setGroup }
}