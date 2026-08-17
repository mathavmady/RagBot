import { useState } from 'react'
import { Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout.jsx'
import ChatBox   from '../../components/chat/ChatBox.jsx'
import ChatInput from '../../components/chat/ChatInput.jsx'
import { useChat } from '../../hooks/useChat.js'
import { formatRelative, classNames } from '../../utils/helpers.js'
import { ConfirmModal } from '../../components/common/Modal.jsx'

function SessionItem({ session, isActive, onSelect, onDelete }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      className={classNames(
        'group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150',
        isActive ? 'bg-crimson-50 text-crimson-800' : 'hover:bg-gray-50 text-gray-700'
      )}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <MessageSquare size={14} className={isActive ? 'text-crimson-600 shrink-0' : 'text-gray-400 shrink-0'} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium font-sans truncate">{session.title || 'New Chat'}</p>
        <p className="text-[10px] text-gray-400 font-sans mt-0.5">
          {formatRelative(session.createdAt)}
        </p>
      </div>
      {(hover || isActive) && (
        <button
         onClick={(e) => { e.stopPropagation(); onDelete(session.sessionId) }}
          className="shrink-0 p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

export default function ChatPage() {
  const {
    sessions, activeSession, messages, isThinking,
    sendMessage, newSession, startOrContinueSession, deleteSession,
    filter, setFilter,
  } = useChat()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

const handleDelete = async () => {
  if (!deleteTarget) return;

  console.log("Deleting session:", deleteTarget);

  setDeleteLoading(true)
  await deleteSession(deleteTarget)
  setDeleteLoading(false)
  setDeleteTarget(null)
}

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-56px)] overflow-hidden">
        {/* History sidebar */}
        <aside className={classNames(
          'border-r border-gray-100 bg-white flex flex-col transition-all duration-300 shrink-0 overflow-hidden',
          sidebarOpen ? 'w-60' : 'w-0 lg:w-12'
        )}>
          {sidebarOpen ? (
            <>
              <div className="px-3 pt-4 pb-2 flex items-center gap-2">
                <button
                  onClick={newSession}
                  className="flex-1 flex items-center gap-2 bg-crimson-700 text-white text-xs font-sans font-medium px-3 py-2 rounded-xl hover:bg-crimson-800 transition-colors"
                >
                  <Plus size={13}/> New chat
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={15}/>
                </button>
              </div>
              <div className="px-3 py-2 flex-1 overflow-y-auto space-y-0.5">
                {sessions.length === 0 ? (
                  <p className="text-[11px] text-gray-400 font-sans text-center py-8 px-2 leading-relaxed">
                    Start a new conversation to see it here
                  </p>
                ) : (
                  sessions.map(s => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      isActive={activeSession?.id === s.id}
                      onSelect={() => startOrContinueSession(s.id)}
                      onDelete={(id) => setDeleteTarget(id)}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="hidden lg:flex flex-col items-center pt-4 gap-2">
              <button
                onClick={newSession}
                className="p-2 bg-crimson-700 text-white rounded-xl hover:bg-crimson-800 transition-colors"
                title="New chat"
              >
                <Plus size={15}/>
              </button>
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ChevronRight size={15}/>
              </button>
            </div>
          )}
        </aside>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight size={15}/>
                </button>
              )}
              <div>
                <h1 className="font-display text-lg font-semibold text-gray-900">
                  {activeSession?.title || 'Ask Syllabex'}
                </h1>
                {activeSession && (
                  <p className="text-[11px] text-gray-400 font-sans">
                    {activeSession.messageCount || 0} messages
                  </p>
                )}
              </div>
            </div>
            {/* Filter */}
            <div className="flex items-center gap-2">
              {filter && (
                <span className="text-xs bg-crimson-50 text-crimson-700 border border-crimson-200 px-2.5 py-1 rounded-full font-sans font-medium flex items-center gap-1.5">
                  <Filter size={10}/> {filter}
                  <button onClick={() => setFilter(null)} className="hover:text-crimson-900 ml-0.5">×</button>
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ChatBox messages={messages} isThinking={isThinking} />

            {/* Input area */}
            <div className="px-4 pb-4 pt-2 shrink-0 bg-gradient-to-t from-[#FAFAFA] to-transparent">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  onSend={sendMessage}
                  disabled={isThinking}
                />
                <p className="text-center text-[10px] text-gray-300 font-sans mt-2">
                  Syllabex answers only from your institution's approved materials
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete chat?"
        message="This will permanently remove this conversation and cannot be undone."
        confirmLabel="Delete"
      />
    </AppLayout>
  )
}
