import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../hooks/useAuth'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

function LoginPage() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  async function onSubmit(values: LoginFormValues) {
    setAuthError(null)
    const { error } = await signIn(values.email, values.password)
    if (error) {
      setAuthError(error.message)
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="w-full max-w-sm rounded border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
      <h1 className="text-xl font-semibold text-primary">Login</h1>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-primary">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="mt-1.5 block w-full rounded border border-slate-300 px-3 py-2 text-sm text-primary placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/40 focus:outline-none"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-primary">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1.5 block w-full rounded border border-slate-300 px-3 py-2 text-sm text-primary placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/40 focus:outline-none"
            {...register('password')}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-primary">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 accent-primary focus:ring-2 focus:ring-accent/40"
              {...register('rememberMe')}
            />
            Remember me
          </label>

          <a href="#" className="text-sm font-medium text-accent hover:underline">
            Forgot password?
          </a>
        </div>

        {authError && <p className="text-sm text-red-600">{authError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </div>
  )
}

export default LoginPage
