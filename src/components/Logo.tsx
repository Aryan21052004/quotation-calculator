interface LogoProps {
  className?: string
}

/**
 * Aryan Aviation and Air Part brand mark: a triangle assembled from four
 * facets in shades of blue (vector recreation of the supplied logo).
 */
function Logo({ className = 'h-8 w-8' }: LogoProps) {
  return (
    <svg viewBox="0 0 160 124" aria-hidden="true" className={className}>
      <polygon points="80,10 60,44.7 80,79.3 100,44.7" fill="#7FB3F5" />
      <polygon points="100,44.7 80,79.3 120,79.3" fill="#4379DD" />
      <polygon points="40,79.3 80,79.3 60,114 20,114" fill="#5589E4" />
      <polygon points="80,79.3 120,79.3 140,114 100,114" fill="#2C5FD1" />
    </svg>
  )
}

export default Logo
