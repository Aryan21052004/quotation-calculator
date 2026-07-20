function Footer() {
  return (
    <footer className="border-t border-slate-200/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Aerostratus</p>
      </div>
    </footer>
  )
}

export default Footer
