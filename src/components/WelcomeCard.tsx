import Card from './Card'

interface WelcomeCardProps {
  name: string
}

function WelcomeCard({ name }: WelcomeCardProps) {
  return (
    <Card>
      <p className="text-lg font-semibold text-primary">Welcome back</p>
      <p className="mt-1 text-sm text-slate-500">{name}</p>
    </Card>
  )
}

export default WelcomeCard
