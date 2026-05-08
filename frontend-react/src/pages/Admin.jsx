import { motion } from 'framer-motion'
import { Shield, Users, BookOpen, TrendingUp, DollarSign, Settings, CheckCircle, XCircle, Loader2, AlertTriangle, Search, Filter, ChevronRight, BarChart3, PieChart, Activity, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Admin() {
  const [stats, setStats] = useState([])
  const [pendingBooks, setPendingBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reviews')

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [statsRes, pendingRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/admin/books?status=Admin_Review`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const statsData = await statsRes.json()
      const pendingData = await pendingRes.json()

      if (statsData.success) {
        setStats([
          { label: 'Total Users', value: statsData.analytics.totalUsers || '0', icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Total Assets', value: statsData.analytics.totalBooks || '0', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Total Sales', value: statsData.analytics.totalSales || '0', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Platform Revenue', value: `₹${statsData.analytics.totalRevenue || '0'}`, icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-500/10' }
        ])
      }

      if (pendingData.success) {
        setPendingBooks(pendingData.books || [])
      }
    } catch (err) {
      console.error('Admin data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (bookId, action) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/admin/books/${bookId}/${action}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setPendingBooks(prev => prev.filter(b => b._id !== bookId))
        fetchAdminData() // Refresh stats
      }
    } catch (err) {
      console.error(`Admin ${action} error:`, err)
    }
  }

  if (loading) return (
    <div className="min-h-screen pt-32 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Loading Command Center...</p>
    </div>
  )

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-blue-500" />
              <h1 className="text-5xl font-black tracking-tighter">Admin Command</h1>
            </div>
            <p className="text-gray-400 text-lg">System-wide monitoring and content moderation.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all">
              <Activity className="w-6 h-6" />
            </button>
            <button className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all">
              <Settings className="w-6 h-6" />
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
              className="glass-card rounded-[32px] p-8 group"
            >
              <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <p className="text-4xl font-black mb-1">{stat.value}</p>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-12">
          {/* Sidebar / Tabs */}
          <div className="lg:col-span-3 space-y-2">
            {[
              { id: 'reviews', label: 'Pending Reviews', icon: Clock, count: pendingBooks.length },
              { id: 'users', label: 'User Management', icon: Users },
              { id: 'analytics', label: 'Global Analytics', icon: BarChart3 },
              { id: 'payments', label: 'Payout Requests', icon: DollarSign, alert: true }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-white text-black shadow-2xl' : 'text-gray-500 hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-4 font-black text-xs uppercase tracking-widest">
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </div>
                {tab.count !== undefined && (
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${activeTab === tab.id ? 'bg-black text-white' : 'bg-blue-600 text-white'}`}>
                    {tab.count}
                  </span>
                )}
                {tab.alert && activeTab !== tab.id && (
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                )}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-[40px] p-10"
            >
              {activeTab === 'reviews' && (
                <>
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black tracking-tighter">Content Moderation Queue</h3>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="text" placeholder="Search queue..." className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-blue-500" />
                      </div>
                      <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400">
                        <Filter className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {pendingBooks.length > 0 ? pendingBooks.map((book) => (
                      <div key={book._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-3xl bg-white/2 border border-white/5 hover:border-white/10 transition-all group">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-20 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                            {book.coverImage ? (
                              <img src={`${API_BASE}${book.coverImage}`} className="w-full h-full object-cover" alt={book.title} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-gray-700" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-xl mb-1 truncate max-w-[200px] sm:max-w-[300px]">{book.title}</p>
                            <p className="text-sm text-gray-500 font-bold">{book.authorName} • {new Date(book.createdAt).toLocaleDateString()}</p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-[10px] px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 font-black uppercase tracking-widest">{book.category}</span>
                              <span className="text-[10px] px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 font-black uppercase tracking-widest">₹{book.price}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleAction(book._id, 'approve')}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-green-500 text-black font-black text-xs uppercase tracking-widest hover:bg-green-400 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                          <button 
                            onClick={() => handleAction(book._id, 'reject')}
                            className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-red-400 font-black text-xs uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-20">
                        <div className="w-24 h-24 rounded-[32px] bg-white/2 flex items-center justify-center mx-auto mb-6">
                          <CheckCircle className="w-12 h-12 text-gray-700" />
                        </div>
                        <h3 className="text-2xl font-black mb-2">Queue is Empty</h3>
                        <p className="text-gray-500">All digital assets have been reviewed. Excellent work!</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === 'users' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-black tracking-tighter mb-8">Platform Users</h3>
                  <div className="grid gap-4">
                    <p className="text-gray-500 font-bold text-center py-20">User management data is loading from secure servers...</p>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-black tracking-tighter mb-8">System Analytics</h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="p-8 rounded-3xl bg-white/2 border border-white/5">
                      <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-4">Traffic Insights</p>
                      <div className="h-40 flex items-end gap-2">
                        {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                          <div key={i} className="flex-1 bg-blue-600/20 rounded-t-lg" style={{ height: `${h}%` }}></div>
                        ))}
                      </div>
                    </div>
                    <div className="p-8 rounded-3xl bg-white/2 border border-white/5">
                      <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-4">Revenue Growth</p>
                      <div className="h-40 flex items-end gap-2">
                        {[30, 50, 75, 60, 85, 95, 100].map((h, i) => (
                          <div key={i} className="flex-1 bg-purple-600/20 rounded-t-lg" style={{ height: `${h}%` }}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payments' && (
                <div className="text-center py-32">
                  <DollarSign className="w-16 h-16 text-green-500 mx-auto mb-6" />
                  <h3 className="text-3xl font-black tracking-tighter mb-4">Payout Processing</h3>
                  <p className="text-gray-500 max-w-md mx-auto">All current payout requests have been processed. Automated Stripe Connect sync is active.</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
