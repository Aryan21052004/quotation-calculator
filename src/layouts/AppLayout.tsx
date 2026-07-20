import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background print:bg-white">
      <div className="print:hidden">
        <Header />
      </div>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 print:max-w-none print:p-0">
          <Outlet />
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  )
}

export default AppLayout
