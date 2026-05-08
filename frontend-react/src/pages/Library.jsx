import { motion } from 'framer-motion'
import { BookOpen, Library as LibraryIcon, Download, Star, Clock, Loader2, Search, Filter, BookMarked, PlayCircle, MoreVertical } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Library() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchLibrary()
  }, [])

  const fetchLibrary = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/payments/my-purchases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setBooks(data.purchases.map(p => ({
          ...p.book,
          paymentId: p._id,
          purchasedAt: p.createdAt
        })))
      }
    } catch (err) {
      console.error('Library fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen pt-32 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Syncing Your Library...</p>
    </div>
  )

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <LibraryIcon className="w-8 h-8 text-blue-400" />
              <h1 className="text-5xl font-black tracking-tighter">My Library</h1>
            </div>
            <p className="text-gray-400 text-lg">Your personal collection of premium digital assets.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text"
                placeholder="Search your library..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none min-w-[300px] transition-all"
              />
            </div>
          </div>
        </div>

        {books.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-32 glass-card rounded-[40px] border-dashed"
          >
            <div className="w-24 h-24 rounded-[32px] bg-white/2 flex items-center justify-center mx-auto mb-8">
              <BookMarked className="w-12 h-12 text-gray-700" />
            </div>
            <h3 className="text-3xl font-black mb-4">Your Library is Empty</h3>
            <p className="text-gray-500 mb-10 max-w-md mx-auto font-medium">Start exploring the marketplace to build your premium digital collection.</p>
            <Link
              to="/explore"
              className="px-10 py-5 rounded-2xl bg-white text-black font-black text-lg hover:bg-gray-200 transition-all shadow-2xl shadow-white/10"
            >
              Explore Marketplace
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredBooks.map((book, idx) => (
              <motion.div
                key={book._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative"
              >
                <div className="relative aspect-[3/4] rounded-[32px] overflow-hidden mb-6 bg-white/5 border border-white/10 shadow-2xl">
                  <img 
                    src={book.coverUrl || (book.coverImage ? (book.coverImage.startsWith('http') ? book.coverImage : `${API_BASE}${book.coverImage}`) : '/assets/covers/Ebook_AI.png')} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    alt={book.title} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-8 flex flex-col justify-end">
                    <div className="flex gap-3 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                      <Link
                        to={`/book/${book._id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                      >
                        <PlayCircle className="w-4 h-4" /> Read
                      </Link>
                      <a 
                        href={`${API_BASE}${book.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-blue-600 hover:border-blue-600 transition-all"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="px-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-400/10">
                      {book.category || 'Asset'}
                    </span>
                    <button className="p-1 text-gray-500 hover:text-white transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-xl font-black mb-1 truncate group-hover:text-blue-400 transition-colors">{book.title}</h3>
                  <p className="text-gray-500 font-bold text-sm">by {book.authorName}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

