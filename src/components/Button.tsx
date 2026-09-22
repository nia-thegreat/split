import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-300',
  secondary:
    'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 disabled:border-neutral-200 disabled:text-neutral-300',
  danger:
    'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:text-neutral-200',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  const classes = [
    'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed',
    variantClasses[variant],
    className,
  ].join(' ')
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}