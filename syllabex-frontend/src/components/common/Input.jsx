import { forwardRef } from 'react'
import { classNames } from '../../utils/helpers.js'

const Input = forwardRef(({
  label,
  error,
  hint,
  icon,
  iconRight,
  className = '',
  wrapperClass = '',
  size = 'md',
  ...props
}, ref) => {
  const sizes = {
    sm: 'text-sm px-3 py-2 rounded-lg',
    md: 'text-sm px-4 py-2.5 rounded-xl',
    lg: 'text-base px-4 py-3 rounded-xl',
  }

  return (
    <div className={classNames('flex flex-col gap-1.5', wrapperClass)}>
      {label && (
        <label className="text-xs font-semibold uppercase tracking-widest text-gray-500 font-sans">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={classNames(
            'w-full bg-white border font-sans text-gray-900 placeholder:text-gray-400',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-crimson-500/30 focus:border-crimson-500',
            error
              ? 'border-red-400 bg-red-50 focus:ring-red-300/30 focus:border-red-500'
              : 'border-gray-200 hover:border-gray-300',
            icon      && 'pl-10',
            iconRight && 'pr-10',
            sizes[size],
            className
          )}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-600 font-sans">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 font-sans">{hint}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
