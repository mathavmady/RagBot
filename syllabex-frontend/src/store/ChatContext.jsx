import { createContext, useContext, useState, useCallback } from 'react'
import { generateSessionId } from '../utils/helpers.js'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [sessions,       setSessions]       = useState([])
  const [activeSession,  setActiveSession]  = useState(null)
  const [messages,       setMessages]       = useState([])
  const [isThinking,     setIsThinking]     = useState(false)
  const [filter,         setFilter]         = useState(null) // source_file_filter

  const newSession = useCallback(() => {
    const id = generateSessionId()
    const session = { id, title: 'New Chat', createdAt: new Date().toISOString(), messageCount: 0 }
    setSessions(prev => [session, ...prev])
    setActiveSession(session)
    setMessages([])
    return session
  }, [])

  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { ...msg, id: Date.now() + Math.random() }])
    setActiveSession(prev => prev ? { ...prev, messageCount: (prev.messageCount || 0) + 1 } : prev)
  }, [])

  const updateSessionTitle = useCallback((sessionId, title) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s))
    setActiveSession(prev => prev?.id === sessionId ? { ...prev, title } : prev)
  }, [])

  return (
    <ChatContext.Provider value={{
      sessions, setSessions,
      activeSession, setActiveSession,
      messages, setMessages,
      isThinking, setIsThinking,
      filter, setFilter,
      newSession, addMessage, updateSessionTitle,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChatContext = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}
