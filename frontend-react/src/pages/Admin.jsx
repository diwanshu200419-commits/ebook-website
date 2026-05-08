import { motion } from 'framer-motion'
import { Shield, Users, BookOpen, TrendingUp, DollarSign, Settings, CheckCircle, XCircle } from 'lucide-react'

export default function Admin() {
  const stats = [
    { label: 'Total Users', value: '1,234', icon: Users, color: 'from-blue-500 to-purple-600' },
    { label: 'Total Books', value: '567', icon: BookOpen, color: 'from-green-500 to-teal-600' },
    { label: 'Total Sales', value: '₹89,234', icon: DollarSign, color: 'from-yellow-500 to-orange-600' },
    { label: 'Pending Reviews', value: '12', icon: TrendingUp, color: 'from-purple-500 to-pink-600' }
  ]

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-purple-400" />
            <h1 className="text-4xl font-extrabold">Admin Dashboard</h1>
          </div>
          <p className="text-gray-400 text-lg">Manage your platform and moderate content</p>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold mb-6">Pending Book Reviews</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30"></div>
                  <div>
                    <p className="font-semibold">Book Title {i + 1}</p>
                    <p className="text-sm text-gray-400">Author Name • 2 hours ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
