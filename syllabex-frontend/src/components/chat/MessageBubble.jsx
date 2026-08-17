import ReactMarkdown from 'react-markdown'
import { BookOpen, User, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { formatTimestamp } from '../../utils/helpers.js'
import { useState } from 'react'

function SourceTag({ source }) {
  const file =
    source.sourceFile || source.source_file || "Unknown"

  const page =
    source.pageNumber || source.page_number || "-"

  const score =
    source.relevanceScore || source.relevance_score

  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full font-sans hover:border-crimson-300 hover:text-crimson-700 transition-colors cursor-default">
      <BookOpen size={11} />

      <span className="font-medium truncate max-w-[160px]">
        {file.replace('.pdf', '')}
      </span>

      <span className="text-gray-300">·</span>

      <span>p.{page}</span>

      {score && (
        <span className="ml-0.5 text-gray-400">
          {(score * 100).toFixed(0)}%
        </span>
      )}
    </span>
  )
}

export default function MessageBubble({ message }) {
  const isUser     = message.role === 'user'
  const isError    = message.error
  const [showSrc, setShowSrc] = useState(false)
  const hasSources = !isUser && message.sources?.length > 0

  return (
    <div className={`flex gap-3 animate-fade-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
        isUser
          ? 'bg-crimson-700 text-white'
          : isError
            ? 'bg-red-100 text-red-600 border border-red-200'
            : 'bg-gray-900 text-white'
      }`}>
        {isUser
          ? <User size={15} />
          : isError
            ? <AlertCircle size={15} />
            : <BookOpen size={14} />
        }
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-crimson-700 text-white rounded-tr-sm'
            : isError
              ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-sm'
              : 'bg-white border border-gray-100 shadow-card rounded-tl-sm'
        }`}>
          {isUser ? (
            <p className="text-sm font-sans leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Sources */}
        {hasSources && (
          <div className="w-full">
            <button
              onClick={() => setShowSrc(p => !p)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-crimson-600 transition-colors font-sans py-1"
            >
              <BookOpen size={11} />
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
              {showSrc ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
            </button>
            {showSrc && (
              <div className="flex flex-wrap gap-1.5 animate-fade-in mt-0.5">
                {message.sources.map((src, i) => <SourceTag key={i} source={src} />)}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[11px] text-gray-300 font-sans px-1">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  )
}
