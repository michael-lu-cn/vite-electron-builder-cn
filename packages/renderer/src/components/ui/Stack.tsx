import type React from 'react'

export function Stack({
  children,
  gap = 12,
  vertical = true,
  className,
}: {
  children: React.ReactNode
  gap?: number
  vertical?: boolean
  className?: string
}) {
  const style = {
    display: 'flex',
    flexDirection: vertical ? ('column' as const) : ('row' as const),
    gap: `${gap}px`,
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div className={className} style={style}>
      {children}
    </div>
  )
}

export default Stack
