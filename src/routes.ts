import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layouts'
import { ProtectedRoute } from './components'
import { LoginPage, DashboardPage, CalculatorPage, NotFoundPage } from './pages'

const router = createBrowserRouter([
  {
    Component: AppLayout,
    children: [
      { path: '/', Component: LoginPage },
      {
        Component: ProtectedRoute,
        children: [
          { path: '/dashboard', Component: DashboardPage },
          { path: '/calculator', Component: CalculatorPage },
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
])

export default router
