import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip } from 'lucide-react'
import { classNames } from '../../utils/helpers.js'

export default function ChatInput({ onSend, disabled, placeholder }) {
  const [value, setVal] = useState('')
  const ref = useRef(null)

  const ph = placeholder || 'Ask anything from your syllabus…'

  // Auto-resize textarea
  useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 160)}px`
  }, [value])

  const submit = () => {
    const q = value.trim()
    if (!q || disabled) return
    onSend(q)
    setVal('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-card hover:border-gray-300 focus-within:border-crimson-400 focus-within:shadow-red transition-all duration-200">
      <div className="flex items-end gap-2 px-4 py-3">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={e => setVal(e.target.value)}
          onKeyDown={onKey}
          disabled={disabled}
          placeholder={ph}
          className={classNames(
            'flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400',
            'font-sans leading-relaxed focus:outline-none min-h-[24px] max-h-[160px]',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        <button
          onClick={submit}
          disabled={!value.trim() || disabled}
          className={classNames(
            'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200',
            value.trim() && !disabled
              ? 'bg-crimson-700 text-white hover:bg-crimson-800 shadow-red'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          )}
        >
          <Send size={15} />
        </button>
      </div>
      <div className="px-4 pb-2.5 flex items-center gap-2">
        <span className="text-[11px] text-gray-300 font-sans">
          ↵ Enter to send &nbsp;·&nbsp; Shift+↵ for new line
        </span>
      </div>
    </div>
  )
}
