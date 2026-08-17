import { forwardRef } from 'react'
import { classNames } from '../../utils/helpers.js'

const variants = {
  primary:   'bg-crimson-700 text-white hover:bg-crimson-800 active:bg-crimson-900 shadow-red hover:shadow-lg disabled:bg-crimson-200',
  secondary: 'bg-white text-gray-800 border border-gray-200 hover:border-crimson-300 hover:text-crimson-700 hover:bg-crimson-50 disabled:opacity-40',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:opacity-40',
  outline:   'border-2 border-crimson-700 text-crimson-700 hover:bg-crimson-700 hover:text-white disabled:opacity-40',
}

const sizes = {
  xs: 'text-xs px-2.5 py-1.5 rounded-md',
  sm: 'text-sm px-3.5 py-2 rounded-lg',
  md: 'text-sm px-5 py-2.5 rounded-lg',
  lg: 'text-base px-6 py-3 rounded-xl',
  xl: 'text-base px-8 py-3.5 rounded-xl',
}

const Button = forwardRef(({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  icon     = null,
  iconPos  = 'left',
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={classNames(
        'inline-flex items-center justify-center gap-2 font-sans font-medium',
        'transition-all duration-200 cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-500 focus-visible:ring-offset-2',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'cursor-not-allowed',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path  className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          <span>{typeof loading === 'string' ? loading : children}</span>
        </>
      ) : (
        <>
          {icon && iconPos === 'left'  && <span className="shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPos === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
