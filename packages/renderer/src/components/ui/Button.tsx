import type React from 'react'

export function Button({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium shadow-sm ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default Button
