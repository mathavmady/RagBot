import { useCallback, useEffect } from 'react'
import { useChatContext } from '../store/ChatContext.jsx'
import { chatService } from '../services/chatService.js'
import { useAuth } from './useAuth.js'
import toast from 'react-hot-toast'

export function useChat() {
  const ctx  = useChatContext()
  const { user } = useAuth()

  // Load sessions on mount
  useEffect(() => {
    if (!user) return
    chatService.getSessions()
      .then(res => ctx.setSessions(res.data || []))
      .catch(() => {})
  }, [user]) // eslint-disable-line

  const startOrContinueSession = useCallback((sessionId) => {
    const existing = ctx.sessions.find(s => s.id === sessionId)
    if (existing) {
      ctx.setActiveSession(existing)
      ctx.setMessages([])
      // Load history
      chatService.getHistory(sessionId)
        .then(res => ctx.setMessages(res.data || []))
        .catch(() => {})
    }
  }, [ctx])

  const sendMessage = useCallback(async (question) => {
    if (!question.trim() || ctx.isThinking) return

    // Ensure we have an active session
    let session = ctx.activeSession
    if (!session) session = ctx.newSession()

    const userMsg = {
      role:      'user',
      content:   question,
      timestamp: new Date().toISOString(),
    }
    ctx.addMessage(userMsg)
    ctx.setIsThinking(true)

    // Auto-title the session from first question
    if (!session.messageCount || session.messageCount === 0) {
      const title = question.length > 50 ? question.slice(0, 50) + '…' : question
      ctx.updateSessionTitle(session.id, title)
    }

    try {
      const res = await chatService.ask(question, session.id, ctx.filter)
      const { answer, sources, timestamp } = res.data

      ctx.addMessage({
        role:      'assistant',
        content:   answer,
        sources:   sources || [],
        timestamp: timestamp || new Date().toISOString(),
      })
    } catch (err) {
      toast.error(err.message || 'Failed to get a response.')
      ctx.addMessage({
        role:      'assistant',
        content:   'I encountered an error. Please try again.',
        sources:   [],
        timestamp: new Date().toISOString(),
        error:     true,
      })
    } finally {
      ctx.setIsThinking(false)
    }
  }, [ctx])

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await chatService.deleteSession(sessionId)
      ctx.setSessions(prev => prev.filter(s => s.sessionId !== sessionId))
      if (ctx.activeSession?.id === sessionId) {
        ctx.setActiveSession(null)
        ctx.setMessages([])
      }
    } catch {
      toast.error('Failed to delete chat.')
    }
  }, [ctx])

  return {
    ...ctx,
    sendMessage,
    startOrContinueSession,
    deleteSession,
  }
}
