import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { BookOpen } from 'lucide-react'

function ThinkingBubble() {
  return (
    <div className="flex gap-3 animate-fade-up">
      <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0 mt-0.5">
        <BookOpen size={14} />
      </div>
      <div className="bg-white border border-gray-100 shadow-card rounded-2xl rounded-tl-sm px-5 py-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-crimson-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-crimson-500 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-crimson-600 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

function EmptyState() {
  const suggestions = [
    'What are the key concepts in this subject?',
    'Explain the first chapter in simple terms',
    'What are the important formulas I need to know?',
    'Summarise the main topics for my exam',
  ]
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-crimson-50 border border-crimson-100 flex items-center justify-center mb-5">
        <BookOpen size={28} className="text-crimson-600" />
      </div>
      <h2 className="font-display text-2xl font-semibold text-gray-900 mb-2">
        Ask your syllabus
      </h2>
      <p className="text-sm text-gray-500 font-sans max-w-xs mb-8 leading-relaxed">
        I'll answer strictly from your institution's approved study materials — no hallucinations.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className="text-left text-sm text-gray-600 bg-white border border-gray-100 rounded-xl px-4 py-3 font-sans hover:border-crimson-200 hover:text-crimson-700 hover:bg-crimson-50/50 transition-all cursor-default leading-snug"
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ChatBox({ messages, isThinking }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  if (!messages.length && !isThinking) return <EmptyState />

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
      {messages.map((msg) => (
        <MessageBubble key={msg.id || msg.timestamp} message={msg} />
      ))}
      {isThinking && <ThinkingBubble />}
      <div ref={endRef} />
    </div>
  )
}
