import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Explore() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    fetchBooks()
  }, [search, category])

  const fetchBooks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      params.set('limit', '60')

      const res = await fetch(`${API_BASE}/api/books?${params.toString()}`)
      const data = await res.json()
      let fetchedBooks = data.books || []

      if (sort === 'newest') fetchedBooks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      if (sort === 'price-low') fetchedBooks.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
      if (sort === 'price-high') fetchedBooks.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
      if (sort === 'trending') fetchedBooks.sort((a, b) => Number(b.salesCount || 0) - Number(a.salesCount || 0))

      setBooks(fetchedBooks)
    } catch (err) {
      console.error('Error fetching books:', err)
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    '', 'Technology', 'AI', 'Programming', 'Business', 'Self Help', 
    'Education', 'Design', 'Finance', 'Book', 'Notes', 'Study', 'Comics'
  ]

  return (
    <div className="min-h-screen pt-28 px-10">
      <main className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Explore Marketplace</h1>
        
        <div className="flex flex-wrap gap-4 mb-8">
          <input 
            id="searchInput" 
            placeholder="Search books..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none min-w-[220px]"
          />
          <select 
            id="categorySelect" 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat || 'All Categories'}</option>
            ))}
          </select>
          <select 
            id="sortSelect" 
            value={sort}
            onChange={(e) => { setSort(e.target.value); fetchBooks() }}
            className="px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:border-primary focus:outline-none"
          >
            <option value="trending">Trending</option>
            <option value="newest">Newest</option>
            <option value="price-low">Price Low to High</option>
            <option value="price-high">Price High to Low</option>
          </select>
          <button 
            id="applyBtn" 
            onClick={fetchBooks}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90 transition"
          >
            Apply
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div id="booksGrid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.length > 0 ? books.map((book) => {
              const cover = book.coverUrl || (book.cover ? `${API_BASE}${book.cover}` : '/assets/covers/Ebook_AI.png')
              return (
                <motion.article 
                  key={book._id}
                  whileHover={{ y: -5 }}
                  className="glass rounded-2xl p-4"
                >
                  <img 
                    src={cover} 
                    alt={book.title} 
                    className="w-full h-56 object-cover rounded-xl mb-4" 
                  />
                  <h3 className="text-lg font-semibold mb-2 truncate">{book.title}</h3>
                  <p className="text-gray-400 text-sm mb-2">{book.category || 'Book'}</p>
                  <p className="text-xl font-bold text-yellow-400 mb-4">
                    ₹{Number(book.price || 0).toLocaleString('en-IN')}
                  </p>
                  <Link 
                    to={`/book/${book._id}`} 
                    className="text-blue-300 hover:text-white transition"
                  >
                    View Details
                  </Link>
                </motion.article>
              )
            }) : (
              <div className="col-span-full text-center py-20 text-gray-400">
                No books found.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
