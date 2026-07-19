function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Aerostratus</p>
      </div>
    </footer>
  )
}

export default Footer
