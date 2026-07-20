import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Card, WelcomeCard, SearchInput } from '../components'
import { Button } from '../components/ui'

function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <WelcomeCard name={user?.email ?? 'User'} />

      <Button variant="primary" onClick={() => navigate('/calculator')} className="w-full sm:w-auto">
        New Calculation
      </Button>

      <Card title="Saved Calculations">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search calculations"
          ariaLabel="Search calculations"
        />
        <p className="mt-4 text-sm text-slate-500">No saved calculations yet.</p>
      </Card>
    </div>
  )
}

export default DashboardPage
