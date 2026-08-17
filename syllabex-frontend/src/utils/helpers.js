import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'

export const formatTimestamp = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isToday(date))     return `Today at ${format(date, 'h:mm a')}`
  if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`
  return format(date, 'MMM d, yyyy • h:mm a')
}

export const formatRelative = (dateString) => {
  if (!dateString) return ''
  return formatDistanceToNow(new Date(dateString), { addSuffix: true })
}

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k  = 1024
  const dm = 2
  const sz = ['B', 'KB', 'MB', 'GB']
  const i  = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sz[i]}`
}

export const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

export const truncate = (str, n = 60) =>
  str && str.length > n ? `${str.slice(0, n)}…` : str

export const classNames = (...classes) => classes.filter(Boolean).join(' ')

export const sleep = (ms) => new Promise(r => setTimeout(r, ms))

export const generateSessionId = () =>
  `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
