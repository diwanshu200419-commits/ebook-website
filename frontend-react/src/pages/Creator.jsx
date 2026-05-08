import { motion } from 'framer-motion'
import { Upload, TrendingUp, DollarSign, BookOpen, Settings, Eye, Zap, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Creator() {
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
              <h1 className="text-4xl font-extrabold mb-2">Creator Dashboard</h1>
              <p className="text-gray-400">Create, publish, and earn from your content</p>
            </div>
            <Link
              to="/creator/upload"
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
            >
              <Upload className="w-5 h-5" />
              Upload New Book
            </Link>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Total Books', value: '8', icon: BookOpen, color: 'from-blue-500 to-purple-600' },
            { label: 'Total Earnings', value: '₹12,450', icon: DollarSign, color: 'from-green-500 to-teal-600' },
            { label: 'This Month', value: '₹3,280', icon: TrendingUp, color: 'from-orange-500 to-pink-600' }
          ].map((stat, idx) => (
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

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-8 h-8 text-yellow-400" />
              <h3 className="text-2xl font-bold">Quick Upload</h3>
            </div>
            <p className="text-gray-400 mb-6">Upload your book, notes, or comics and start earning instantly</p>
            <Link
              to="/creator/upload"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Start Creating
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold mb-6">Your Books</h3>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                  <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Book Title {i + 1}</p>
                    <p className="text-sm text-gray-400">120 sales • ₹199</p>
                  </div>
                  <Eye className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
