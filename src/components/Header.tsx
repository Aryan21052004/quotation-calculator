import { useAuth } from '../hooks/useAuth'
import { Button } from './ui'

function Header() {
  const { session, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white"
          >
            A
          </span>
          <span className="text-lg font-semibold tracking-tight text-primary">Aerostratus</span>
        </span>
        {session && <Button onClick={() => void signOut()}>Logout</Button>}
      </div>
    </header>
  )
}

export default Header
