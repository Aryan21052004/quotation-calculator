import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Card, WelcomeCard, SearchInput } from '../components'

function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  return (
    <div className="w-full max-w-3xl space-y-6">
      <WelcomeCard name={user?.email ?? 'User'} />

      <button
        type="button"
        onClick={() => navigate('/calculator')}
        className="w-full rounded bg-primary px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary/90 focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:outline-none sm:w-auto"
      >
        New Calculation
      </button>

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
