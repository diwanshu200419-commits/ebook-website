import { motion } from 'framer-motion'
import { LayoutDashboard, BookOpen, TrendingUp, DollarSign, Settings, Upload, BookOpenCheck, Bell, Loader2, ArrowUpRight, Clock, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setStats([
          { label: 'Purchased Books', value: data.stats.totalBooks || '0', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Total Spent', value: `₹${data.stats.totalSalesAmount || '0'}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Completed', value: data.stats.totalDownloads || '0', icon: BookOpenCheck, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Active Goals', value: '4', icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10' }
        ])
        setActivities(data.recentActivity || [])
      }
    } catch (err) {
      console.error('Dashboard data error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen pt-32 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Syncing Dashboard...</p>
    </div>
  )

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-5xl font-black tracking-tighter mb-2">Welcome back, {user?.name.split(' ')[0]}!</h1>
            <p className="text-gray-400 text-lg">Here's what's happening with your learning journey today.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/explore" className="px-6 py-3 rounded-xl bg-white text-black font-black text-sm hover:bg-gray-200 transition-all">
              Browse More
            </Link>
            <button className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full border-2 border-black"></span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card rounded-[32px] p-8 group cursor-default"
            >
              <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <p className="text-4xl font-black mb-1">{stat.value}</p>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-8"
          >
            <div className="glass-card rounded-[40px] p-10">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black tracking-tighter">Recent Activity</h3>
                <button className="text-blue-400 text-sm font-bold hover:underline">View All</button>
              </div>
              
              <div className="space-y-6">
                {activities.length > 0 ? activities.map((activity, i) => (
                  <div key={i} className="flex items-center gap-6 group">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                      <Clock className="w-6 h-6 text-gray-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg group-hover:text-blue-400 transition-colors">{activity.message || 'Book purchased successfully'}</p>
                      <p className="text-sm text-gray-500 font-medium">{new Date(activity.createdAt).toLocaleDateString()} • {new Date(activity.createdAt).toLocaleTimeString()}</p>
                    </div>
                    {activity.amount && (
                      <span className="text-xl font-black text-white">₹{activity.amount}</span>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                  </div>
                )) : (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 rounded-full bg-white/2 flex items-center justify-center mx-auto mb-6">
                      <Bell className="w-10 h-10 text-gray-700" />
                    </div>
                    <p className="text-gray-500 font-bold">No recent activities found.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recommended for you */}
            <div className="glass-card rounded-[40px] p-10">
              <h3 className="text-2xl font-black tracking-tighter mb-8">Recommended For You</h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-white/2 border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
                  <div className="aspect-video rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-6 overflow-hidden relative">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                  </div>
                  <h4 className="font-black text-xl mb-2">Mastering AI Workflows</h4>
                  <p className="text-gray-500 text-sm font-bold mb-4 uppercase">Business • Advanced</p>
                  <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-widest">
                    Continue Learning <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="p-6 rounded-3xl bg-white/2 border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
                  <div className="aspect-video rounded-2xl bg-gradient-to-br from-orange-600 to-pink-600 mb-6 overflow-hidden relative">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                  </div>
                  <h4 className="font-black text-xl mb-2">SaaS Architecture 101</h4>
                  <p className="text-gray-500 text-sm font-bold mb-4 uppercase">Technology • Intermediate</p>
                  <div className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-widest">
                    Start Reading <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            {/* Profile Summary */}
            <div className="glass-card rounded-[40px] p-10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 blur-2xl"></div>
              <div className="relative z-10">
                <div className="relative inline-block mb-6">
                  <img src={user?.avatar || '/assets/default-avatar.png'} className="w-24 h-24 rounded-full object-cover border-4 border-white/10 mx-auto" alt="Avatar" />
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-black"></div>
                </div>
                <h3 className="text-2xl font-black tracking-tighter mb-1">{user?.name}</h3>
                <p className="text-gray-500 font-bold text-sm uppercase mb-8 tracking-widest">{user?.role || 'Knowledge Reader'}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-2xl font-black">12</p>
                    <p className="text-[10px] text-gray-500 font-black uppercase">Books</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-2xl font-black">4.8k</p>
                    <p className="text-[10px] text-gray-500 font-black uppercase">Points</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card rounded-[40px] p-10">
              <h3 className="text-xl font-black mb-6 uppercase tracking-widest text-xs text-gray-500">Quick Actions</h3>
              <div className="space-y-3">
                {[
                  { label: 'My Library', icon: BookOpen, path: '/library' },
                  { label: 'Upload Content', icon: Upload, path: '/creator/upload' },
                  { label: 'Marketplace', icon: TrendingUp, path: '/explore' },
                  { label: 'Settings', icon: Settings, path: '/settings' }
                ].map((action, i) => (
                  <Link 
                    key={i} 
                    to={action.path}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all group border border-transparent hover:border-white/5"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <action.icon className="w-5 h-5 text-gray-400 group-hover:text-white" />
                    </div>
                    <span className="font-bold text-gray-400 group-hover:text-white transition-colors">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
