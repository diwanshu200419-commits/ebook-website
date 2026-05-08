import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, SlidersHorizontal, BookOpen, Star, ArrowRight, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Explore() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('trending')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  useEffect(() => {
    fetchBooks()
  }, [search, category, sort])

  const fetchBooks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      params.set('limit', '60')

      // Use the marketplace endpoint for consistency with Home
      const res = await fetch(`${API_BASE}/api/marketplace/trending?${params.toString()}`)
      const data = await res.json()
      let fetchedBooks = data.books || []

      // Filter out duplicate demo books if any, but KEEP "AI Side Hustles for Students"
      const uniqueBooks = [];
      const titles = new Set();
      fetchedBooks.forEach(b => {
        if (b.title === "AI Side Hustles for Students" || !titles.has(b.title)) {
          uniqueBooks.push(b);
          titles.add(b.title);
        }
      });
      fetchedBooks = uniqueBooks;

      if (sort === 'newest') fetchedBooks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      if (sort === 'price-low') fetchedBooks.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
      if (sort === 'price-high') fetchedBooks.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
      if (sort === 'trending') fetchedBooks.sort((a, b) => Number(b.sales || b.salesCount || 0) - Number(a.sales || a.salesCount || 0))

      // Fallback for missing _id if necessary
      fetchedBooks = fetchedBooks.map(b => ({ ...b, _id: b._id || b.id }));

      setBooks(fetchedBooks)
    } catch (err) {
      console.error('Error fetching books:', err)
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    { id: '', name: 'All Assets' },
    { id: 'Business', name: 'Business' },
    { id: 'AI', name: 'Artificial Intelligence' },
    { id: 'Programming', name: 'Programming' },
    { id: 'Comics', name: 'Comics' },
    { id: 'Education', name: 'Education' },
    { id: 'Self Help', name: 'Self Help' }
  ]

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <main className="max-w-7xl mx-auto">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div>
            <h1 className="text-5xl font-black tracking-tighter mb-4">Marketplace</h1>
            <p className="text-gray-400 text-lg">Discover the best digital assets from top creators.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              <input 
                type="text"
                placeholder="Search anything..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 pr-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none min-w-[300px] transition-all"
              />
            </div>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-4 rounded-2xl border transition-all ${isFilterOpen ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
            >
              <SlidersHorizontal className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-12"
            >
              <div className="p-8 rounded-3xl bg-white/2 border border-white/5 grid md:grid-cols-3 gap-8">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${category === cat.id ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Sort By</label>
                  <select 
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/50 appearance-none font-bold"
                  >
                    <option value="trending" className="bg-gray-900">Trending First</option>
                    <option value="newest" className="bg-gray-900">Newest Arrivals</option>
                    <option value="price-low" className="bg-gray-900">Price: Low to High</option>
                    <option value="price-high" className="bg-gray-900">Price: High to Low</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => { setCategory(''); setSearch(''); setSort('trending'); }}
                    className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-all"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Fetching Assets...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {books.length > 0 ? books.map((book, idx) => (
                <motion.article 
                  key={book._id || book.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group"
                >
                  <Link to={`/book/${book._id || book.id}`}>
                    <div className="relative aspect-[3/4] rounded-[32px] overflow-hidden mb-6 bg-white/5 border border-white/10 shadow-2xl">
                      <img 
                        src={book.coverUrl || (book.cover ? (book.cover.startsWith('http') ? book.cover : `${API_BASE}${book.cover}`) : '/assets/covers/Ebook_AI.png')} 
                        alt={book.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 p-8 flex flex-col justify-end">
                        <p className="text-white text-sm line-clamp-3 mb-4 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                          {book.description || 'No description available for this asset.'}
                        </p>
                        <div className="flex items-center gap-2 text-blue-400 font-black text-sm uppercase tracking-tighter translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-75">
                          View Asset Details <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                      {book.price === 0 && (
                        <div className="absolute top-6 left-6 px-4 py-1.5 rounded-full bg-green-500 text-white text-[10px] font-black uppercase tracking-widest shadow-2xl">
                          Free Asset
                        </div>
                      )}
                    </div>
                    
                    <div className="px-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-400/10">
                          {book.category || 'Digital'}
                        </span>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-[10px] font-black text-white">{book.aiScore || book.rating || '4.9'}</span>
                        </div>
                      </div>
                      <h3 className="text-xl font-black mb-1 truncate group-hover:text-blue-400 transition-colors">{book.title}</h3>
                      <p className="text-gray-500 font-bold text-sm mb-4">{book.creator || book.authorName}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-black text-white">
                          {book.price === 0 ? 'FREE' : `₹${book.price}`}
                        </p>
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
                          <BookOpen className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              )) : (
                <div className="col-span-full text-center py-32 bg-white/2 border border-dashed border-white/10 rounded-[40px]">
                  <Search className="w-16 h-16 text-gray-700 mx-auto mb-6" />
                  <h3 className="text-2xl font-black mb-2">No Assets Found</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
                </div>
              )}
            </div>
            
            {books.length > 0 && (
              <div className="mt-20 text-center">
                <button className="px-12 py-5 rounded-2xl bg-white/5 border border-white/10 font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all">
                  Load More Assets
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
