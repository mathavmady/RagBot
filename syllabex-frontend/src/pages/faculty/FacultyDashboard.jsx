import { useEffect, useState } from 'react'
import { MessageSquare, Users, TrendingUp, BookOpen, Eye } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout.jsx'
import { chatService } from '../../services/chatService.js'
import { formatTimestamp, truncate } from '../../utils/helpers.js'
import { SkeletonCard } from '../../components/common/Loader.jsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '../../hooks/useAuth.js'

function StatCard({ icon, label, value, sub, color = 'red' }) {
  const colors = {
    red:    'bg-crimson-50 text-crimson-700 border-crimson-100',
    gray:   'bg-gray-50 text-gray-700 border-gray-100',
    green:  'bg-green-50 text-green-700 border-green-100',
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
  }
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
      <div className={`inline-flex p-2.5 rounded-xl border mb-4 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-display font-semibold text-gray-900">{value}</p>
      <p className="text-sm font-sans font-medium text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 font-sans mt-1">{sub}</p>}
    </div>
  )
}

const mockStats = {
  totalChats: 142, activeStudents: 38, avgPerDay: 12, documents: 7,
  weekly: [
    { day: 'Mon', chats: 18 }, { day: 'Tue', chats: 25 }, { day: 'Wed', chats: 14 },
    { day: 'Thu', chats: 32 }, { day: 'Fri', chats: 28 }, { day: 'Sat', chats: 8 },
    { day: 'Sun', chats: 17 },
  ]
}

export default function FacultyDashboard() {
  const { user } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [chats,   setChats]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      chatService.getChatStats().catch(() => mockStats),
      chatService.getAllChats(0, 8).catch(() => ({ data: [] })),
    ]).then(([sRes, cRes]) => {
      setStats(sRes.data || mockStats)
      setChats(cRes.data?.content || cRes.data || [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Heading */}
        <div>
          <p className="text-xs text-gray-400 font-sans uppercase tracking-widest mb-1">Faculty</p>
          <h1 className="font-display text-3xl font-semibold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0] || 'Professor'}
          </h1>
          <p className="text-sm text-gray-500 font-sans mt-1">Here's how students are engaging with Syllabex</p>
        </div>

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<MessageSquare size={18}/>} label="Total Queries" value={stats?.totalChats ?? '—'} sub="All time" color="red"/>
            <StatCard icon={<Users size={18}/>}         label="Active Students" value={stats?.activeStudents ?? '—'} sub="This week" color="blue"/>
            <StatCard icon={<TrendingUp size={18}/>}    label="Avg / Day" value={stats?.avgPerDay ?? '—'} sub="Last 7 days" color="green"/>
            <StatCard icon={<BookOpen size={18}/>}      label="Documents" value={stats?.documents ?? '—'} sub="Indexed" color="gray"/>
          </div>
        )}

        {/* Chart */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-1">Query activity</h3>
          <p className="text-xs text-gray-400 font-sans mb-5">Number of questions asked per day this week</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.weekly || mockStats.weekly} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
              <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: 'DM Sans', fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fontFamily: 'DM Sans', fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
              <Tooltip
                contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 10, border: '1px solid #F3F4F6', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                cursor={{ fill: '#FFF0F0' }}
              />
              <Bar dataKey="chats" fill="#C80000" radius={[6, 6, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent chats */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-gray-900">Recent queries</h3>
            <span className="text-xs text-gray-400 font-sans">Last 8 questions</span>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_,i) => <SkeletonCard key={i}/>)}
            </div>
          ) : chats.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400 font-sans">No queries yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {chats.map((c, i) => (
                <div key={c.id || i} className="px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans font-medium text-gray-800 truncate">{truncate(c.question, 80)}</p>
                      <p className="text-xs text-gray-400 font-sans mt-0.5">
                        {c.userName || 'Student'} · {formatTimestamp(c.timestamp)}
                      </p>
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-sans shrink-0">
                      {c.status || 'success'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
