import { useAuth } from '../hooks/useAuth'

function Header() {
  const { session, signOut } = useAuth()

  return (
    <header className="border-b border-slate-200 bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="text-lg font-semibold text-primary">Aerostratus</span>
        {session && (
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-slate-50"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  )
}

export default Header
