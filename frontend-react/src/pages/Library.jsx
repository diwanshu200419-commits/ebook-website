import { motion } from 'framer-motion'
import { BookOpen, Library as LibraryIcon, Download, Star, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Library() {
  const books = [
    { id: 1, title: 'AI for Beginners', author: 'Tech Academy', price: '₹199', rating: 4.8, progress: 75 },
    { id: 2, title: 'Side Hustles for Students', author: 'E-BOOK MARKET', price: 'FREE', rating: 4.9, progress: 100 },
    { id: 3, title: 'Topper\'s Notes', author: 'Top Students', price: '₹99', rating: 4.7, progress: 30 }
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
            <LibraryIcon className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-extrabold">My Library</h1>
          </div>
          <p className="text-gray-400 text-lg">Your purchased books and learning materials</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {books.map((book, idx) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -8 }}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10"
            >
              <div className="p-6">
                <div className="w-full h-48 rounded-2xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-16 h-16 text-blue-400" />
                </div>
                
                <h3 className="text-xl font-bold mb-2">{book.title}</h3>
                <p className="text-gray-400 mb-4">{book.author}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-yellow-400 font-semibold">{book.rating}</span>
                  </div>
                  <span className={`font-bold ${book.price === 'FREE' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {book.price}
                  </span>
                </div>

                {book.progress < 100 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-blue-400 font-semibold">{book.progress}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${book.progress}%` }}
                        transition={{ delay: idx * 0.1 + 0.3, duration: 0.8 }}
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Link
                    to={`/book/${book.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
                  >
                    {book.progress === 100 ? <Clock className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                    {book.progress === 100 ? 'Read Again' : 'Continue'}
                  </Link>
                  <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {books.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <LibraryIcon className="w-20 h-20 text-gray-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-4">Your library is empty</h3>
            <p className="text-gray-400 mb-8">Start exploring and purchase books to add them here</p>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
            >
              Explore Marketplace
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}
