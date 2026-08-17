import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { classNames } from '../../utils/helpers.js'
import Button from './Button.jsx'

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export default function Modal({
  open, onClose, title, subtitle,
  children, footer, size = 'md',
  closeOnBackdrop = true, showClose = true,
}) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else       document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (closeOnBackdrop && e.target === overlayRef.current) onClose?.() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Panel */}
      <div className={classNames(
        'relative w-full bg-white rounded-2xl shadow-modal flex flex-col',
        'animate-fade-up max-h-[90vh]',
        sizes[size]
      )}>
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
            <div>
              {title && (
                <h2 className="font-display text-xl font-semibold text-gray-900">{title}</h2>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 mt-0.5 font-sans">{subtitle}</p>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="ml-4 shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3 border-t border-gray-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="danger" size="sm" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </>}
    >
      <p className="text-sm text-gray-600 font-sans">{message}</p>
    </Modal>
  )
}
