import { useEffect, useState } from 'react'
import { Users, FileText, MessageSquare, TrendingUp, UserPlus, Upload, BookOpen, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import AppLayout from '../../components/layout/AppLayout.jsx'
import { adminService } from '../../services/adminService.js'
import { ROUTES } from '../../utils/constants.js'
import { SkeletonCard } from '../../components/common/Loader.jsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import { useAuth } from '../../hooks/useAuth.js'

const mockDash = {
  totalStudents: 248, totalFaculty: 12, totalDocuments: 23,
  totalQueries: 1840, queriesThisWeek: 142,
  weekly: [
    { day: 'Mon', q: 45 }, { day: 'Tue', q: 62 }, { day: 'Wed', q: 38 },
    { day: 'Thu', q: 89 }, { day: 'Fri', q: 74 }, { day: 'Sat', q: 21 },
    { day: 'Sun', q: 43 },
  ],
  roles: [{ name: 'Students', value: 248 }, { name: 'Faculty', value: 12 }],
}
const PIE_COLORS = ['#C80000', '#E5E7EB']

function StatCard({ icon, label, value, link, linkLabel, color = 'red' }) {
  const colors = {
    red:   'bg-crimson-50 border-crimson-100 text-crimson-700',
    blue:  'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    gray:  'bg-gray-50 border-gray-100 text-gray-700',
  }
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
      <div className={`inline-flex p-2.5 rounded-xl border mb-4 ${colors[color]}`}>{icon}</div>
      <p className="text-2xl font-display font-semibold text-gray-900">{value}</p>
      <p className="text-sm font-sans font-medium text-gray-700 mt-0.5">{label}</p>
      {link && (
        <Link to={link} className="text-xs text-crimson-600 hover:underline font-sans mt-1 block">
          {linkLabel} →
        </Link>
      )}
    </div>
  )
}

function QuickAction({ to, icon, label, sub }) {
  return (
    <Link to={to} className="flex items-center gap-3.5 p-4 bg-white border border-gray-100 rounded-2xl shadow-card hover:border-crimson-200 hover:shadow-red transition-all group">
      <div className="w-10 h-10 bg-crimson-50 border border-crimson-100 rounded-xl flex items-center justify-center text-crimson-700 group-hover:bg-crimson-700 group-hover:text-white transition-colors shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800 font-sans">{label}</p>
        <p className="text-xs text-gray-400 font-sans">{sub}</p>
      </div>
    </Link>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminService.getDashboardStats()
      .then(res => setData(res.data || mockDash))
      .catch(() => setData(mockDash))
      .finally(() => setLoading(false))
  }, [])

  const d = data || mockDash

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Heading */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 font-sans uppercase tracking-widest mb-1">Administrator</p>
            <h1 className="font-display text-3xl font-semibold text-gray-900">System Dashboard</h1>
            <p className="text-sm text-gray-500 font-sans mt-1">Full overview of Syllabex activity</p>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-sans font-semibold px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            System online
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_,i) => <SkeletonCard key={i}/>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Users size={18}/>}         label="Total Students"  value={d.totalStudents}    color="blue" link={ROUTES.MANAGE_FACULTY} linkLabel="Manage users"/>
            <StatCard icon={<BookOpen size={18}/>}      label="Faculty Members" value={d.totalFaculty}     color="gray" link={ROUTES.MANAGE_FACULTY} linkLabel="View faculty"/>
            <StatCard icon={<FileText size={18}/>}      label="Documents"       value={d.totalDocuments}   color="red"  link={ROUTES.MANAGE_DOCS}    linkLabel="Manage docs"/>
            <StatCard icon={<MessageSquare size={18}/>} label="Total Queries"   value={d.totalQueries}     color="green"/>
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Bar chart */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-1">Query volume</h3>
            <p className="text-xs text-gray-400 font-sans mb-5">Questions asked across all users this week</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={d.weekly} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: 'DM Sans', fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fontFamily: 'DM Sans', fill: '#9CA3AF' }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ fontFamily: 'DM Sans', fontSize: 12, borderRadius: 10, border: '1px solid #F3F4F6' }} cursor={{ fill: '#FFF0F0' }}/>
                <Bar dataKey="q" fill="#C80000" radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Pie */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-card flex flex-col">
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-1">User breakdown</h3>
            <p className="text-xs text-gray-400 font-sans mb-4">Students vs faculty</p>
            <div className="flex-1 flex items-center justify-center">
              <PieChart width={160} height={160}>
                <Pie data={d.roles} cx={75} cy={75} innerRadius={48} outerRadius={72} dataKey="value" paddingAngle={3}>
                  {d.roles.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]}/>)}
                </Pie>
              </PieChart>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {d.roles.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600 font-sans">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }}/>
                  {r.name} ({r.value})
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h3 className="font-display text-lg font-semibold text-gray-900 mb-4">Quick actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickAction to={ROUTES.MANAGE_FACULTY}  icon={<UserPlus size={18}/>}      label="Add Faculty"      sub="Create a new faculty account"/>
            <QuickAction to={ROUTES.MANAGE_DOCS}     icon={<Upload size={18}/>}         label="Upload Document"  sub="Index new study material"/>
            <QuickAction to={ROUTES.CHAT}            icon={<MessageSquare size={18}/>}  label="Test the AI"      sub="Try a query yourself"/>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
