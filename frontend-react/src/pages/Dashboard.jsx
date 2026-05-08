import { motion } from 'framer-motion'
import { LayoutDashboard, BookOpen, TrendingUp, DollarSign, Settings, Upload, BookOpenCheck, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const stats = [
    { label: 'Total Books', value: '12', icon: BookOpen, color: 'from-blue-500 to-purple-600' },
    { label: 'Total Sales', value: '₹4,520', icon: DollarSign, color: 'from-green-500 to-teal-600' },
    { label: 'Total Reads', value: '2.1K', icon: TrendingUp, color: 'from-orange-500 to-pink-600' },
    { label: 'Earnings', value: '₹2,890', icon: DollarSign, color: 'from-purple-500 to-blue-600' }
  ]

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold mb-2">Dashboard</h1>
              <p className="text-gray-400">Welcome back! Here's what's happening with your account</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/creator"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
              >
                <Upload className="w-5 h-5" />
                Upload Book
              </Link>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 p-6"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-20 blur-2xl`}></div>
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-3xl font-bold mb-1">{stat.value}</p>
                <p className="text-gray-400">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Recent Activity</h3>
              <Link to="/notifications" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View All <span className="text-sm">→</span>
              </Link>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">New book sold!</p>
                    <p className="text-sm text-gray-400">2 hours ago</p>
                  </div>
                  <span className="text-green-400 font-semibold">+₹199</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-6"
          >
            <h3 className="text-xl font-bold mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/creator/upload"
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Upload className="w-5 h-5 text-blue-400" />
                <span>Upload New Book</span>
              </Link>
              <Link
                to="/library"
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <BookOpenCheck className="w-5 h-5 text-green-400" />
                <span>My Library</span>
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Settings className="w-5 h-5 text-purple-400" />
                <span>Account Settings</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
