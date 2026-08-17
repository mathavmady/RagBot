import { classNames } from '../../utils/helpers.js'

export default function Loader({ size = 'md', className = '', label = '' }) {
  const s = { sm: 'w-4 h-4 border-2', md: 'w-7 h-7 border-2', lg: 'w-10 h-10 border-[3px]' }
  return (
    <div className={classNames('flex flex-col items-center justify-center gap-3', className)}>
      <div className={classNames(
        'rounded-full border-crimson-200 border-t-crimson-700 animate-spin',
        s[size]
      )} />
      {label && <p className="text-sm text-gray-400 font-sans">{label}</p>}
    </div>
  )
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <Loader size="lg" label={label} />
    </div>
  )
}

export function SkeletonLine({ className = '' }) {
  return <div className={classNames('skeleton rounded h-4', className)} />
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <SkeletonLine className="w-1/3 h-3" />
      <SkeletonLine className="w-full h-5" />
      <SkeletonLine className="w-2/3 h-4" />
    </div>
  )
}
