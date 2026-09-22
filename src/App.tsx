import { useState } from 'react'
import type { Group } from './model/group'
import { GroupScreen } from './components/GroupScreen'
import { GroupSetupScreen } from './components/GroupSetupScreen'

function App() {
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null)

  return (
    <div className="flex min-h-svh flex-col">
      {createdGroup ? <GroupScreen group={createdGroup} /> : <GroupSetupScreen onCreate={setCreatedGroup} />}
    </div>
  )
}

export default App