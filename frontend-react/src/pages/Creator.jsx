import { motion } from 'framer-motion'
import { Upload, TrendingUp, DollarSign, BookOpen, Settings, Eye, Zap, Sparkles, Loader2, BarChart3, ChevronRight, MoreVertical } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Creator() {
  const [stats, setStats] = useState([])
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCreatorData()
  }, [])

  const fetchCreatorData = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const [statsRes, booksRes] = await Promise.all([
        fetch(`${API_BASE}/api/creator/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/books/my/books`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const statsData = await statsRes.json()
      const booksData = await booksRes.json()

      if (statsData.success) {
        setStats([
          { label: 'Total Sales', value: statsData.analytics.totalSales || '0', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Total Earnings', value: `₹${statsData.analytics.totalEarnings || '0'}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Active Assets', value: statsData.analytics.totalBooks || '0', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10' }
        ])
      }

      if (booksData.success) {
        setBooks(booksData.books || [])
      }
    } catch (err) {
      console.error('Creator data error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen pt-32 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Loading Creator Studio...</p>
    </div>
  )

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-5xl font-black tracking-tighter mb-2">Creator Studio</h1>
            <p className="text-gray-400 text-lg">Manage your digital empire and track performance.</p>
          </div>
          <Link
            to="/creator/upload"
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-black text-sm hover:bg-gray-200 transition-all shadow-2xl shadow-white/10"
          >
            <Upload className="w-5 h-5" />
            Publish New Asset
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Assets List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-8"
          >
            <div className="glass-card rounded-[40px] p-10">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black tracking-tighter">Your Assets</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter by:</span>
                  <select className="bg-transparent text-sm font-bold text-blue-400 outline-none">
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-4">
                {books.length > 0 ? books.map((book) => (
                  <div key={book._id} className="flex items-center gap-6 p-6 rounded-3xl bg-white/2 border border-white/5 hover:border-white/10 transition-all group">
                    <div className="w-16 h-20 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                      {book.coverImage ? (
                        <img src={`${API_BASE}${book.coverImage}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={book.title} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-gray-700" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-xl mb-1 truncate group-hover:text-blue-400 transition-colors">{book.title}</h4>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-gray-500">{book.salesCount || 0} Sales</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                        <span className="text-sm font-bold text-white">₹{book.price}</span>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        book.status === 'Approved' ? 'bg-green-500/10 text-green-400' : 
                        book.status === 'Rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {book.status === 'Admin_Review' ? 'In Review' : book.status}
                      </span>
                      <Link 
                        to={`/book/${book._id}`}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 rounded-[32px] bg-white/2 flex items-center justify-center mx-auto mb-6">
                      <Zap className="w-12 h-12 text-gray-700" />
                    </div>
                    <h3 className="text-2xl font-black mb-2">No Assets Yet</h3>
                    <p className="text-gray-500 mb-8">Start your creator journey by uploading your first asset.</p>
                    <Link to="/creator/upload" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-500 transition-all">
                      <Upload className="w-5 h-5" /> Upload Now
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            {/* Analytics Preview */}
            <div className="glass-card rounded-[40px] p-10">
              <div className="flex items-center gap-3 mb-8">
                <BarChart3 className="w-8 h-8 text-blue-400" />
                <h3 className="text-2xl font-black tracking-tighter">Insights</h3>
              </div>
              
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Profile Completion</p>
                    <p className="text-white font-black text-sm">85%</p>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-[85%] bg-gradient-to-r from-blue-500 to-purple-600"></div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-blue-600/10 border border-blue-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                    <h4 className="font-black text-lg">AI Tip</h4>
                  </div>
                  <p className="text-blue-100/70 text-sm leading-relaxed mb-4">
                    Adding a custom cover image increases your asset visibility by <span className="text-white font-bold">45%</span>.
                  </p>
                  <button className="text-blue-400 text-xs font-black uppercase tracking-widest hover:underline">Learn More</button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card rounded-[40px] p-10">
              <h3 className="text-xl font-black mb-6 uppercase tracking-widest text-xs text-gray-500">Creator Hub</h3>
              <div className="space-y-3">
                {[
                  { label: 'View Analytics', icon: BarChart3, path: '#' },
                  { label: 'Marketplace', icon: TrendingUp, path: '/explore' },
                  { label: 'Help Center', icon: Zap, path: '#' },
                  { label: 'Creator Settings', icon: Settings, path: '/settings' }
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
