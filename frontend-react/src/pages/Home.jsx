import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Home() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/books`)
      const data = await res.json()
      setBooks(data.books || [])
    } catch (err) {
      console.error('Error fetching books:', err)
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    { icon: '📊', name: 'Business', count: '1.2K' },
    { icon: '🎓', name: 'Education', count: '2.5K' },
    { icon: '🤖', name: 'AI & Tech', count: '1.8K' },
    { icon: '✍️', name: 'Handwritten', count: '1.1K' },
    { icon: '💬', name: 'Comics', count: '800+' },
    { icon: '🧠', name: 'Self Help', count: '1.6K' },
    { icon: '💻', name: 'Programming', count: '2.2K' },
    { icon: '📝', name: 'Exam Prep', count: '1.3K' },
  ]

  return (
    <div className="min-h-screen pt-24">
      {/* Hero Section */}
      <section className="hero px-10 py-20 flex flex-col lg:flex-row items-center gap-12 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1"
        >
          <p className="tag text-purple-300 font-semibold mb-4">THE FUTURE OF KNOWLEDGE ECONOMY</p>
          <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            World's Best <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Knowledge Earning
            </span> <br />
            Platform
          </h1>
          <p className="sub text-gray-300 text-lg mb-8">
            Create, publish and earn from books, notes, comics and AI-assisted content.  
            <strong className="text-white block mt-2">Built in India. Used Worldwide.</strong>
          </p>

          <div className="actions flex flex-wrap gap-4 mb-8">
            <Link to="/explore" className="btn big px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90 transition">
              Explore Books
            </Link>
            <Link to="/register" className="btn-outline big px-8 py-4 rounded-full border border-white/30 text-white font-semibold hover:border-white transition">
              Become a Creator
            </Link>
          </div>

          <div className="hero-stats flex flex-wrap gap-8">
            <div className="hero-stat flex items-center gap-3">
              <img src="/assets/default-avatar.png" className="w-10 h-10 rounded-full" alt="users" />
              <span>50K+ Creators</span>
            </div>
            <div className="hero-stat">
              <span className="text-yellow-400">⭐⭐⭐⭐⭐</span>
              <span className="text-gray-300 ml-2">4.8/5 from 10K+ users</span>
            </div>
          </div>
        </motion.div>

        {/* Hero Right - Book Cards */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex-1"
        >
          <div className="card-wrap grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/explore" className="book-card featured glass rounded-2xl overflow-hidden relative">
              <img 
                src="/assets/covers/Ebook_AI.png" 
                className="w-full h-64 object-cover" 
                alt="Featured Book" 
              />
              <div className="overlay absolute inset-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent">
                <span className="badge free bg-green-500/80 text-white px-3 py-1 rounded-full text-sm font-semibold mb-2 w-fit">FREE • OFFICIAL</span>
                <h3 className="text-xl font-bold mb-2">Side Hustles for Students</h3>
                <p className="text-gray-300 text-sm mb-4">Business • Career • AI</p>
                <button className="cta-btn bg-white text-black px-6 py-2 rounded-full font-semibold w-fit">
                  Read Now →
                </button>
              </div>
            </Link>

            <div className="flex flex-col gap-4">
              <Link to="/login" className="book-card locked glass rounded-2xl overflow-hidden relative h-32">
                <div className="lock-bg absolute inset-0 bg-black/60"></div>
                <div className="overlay absolute inset-0 p-4 flex flex-col justify-center">
                  <span className="price text-2xl font-bold text-yellow-400">₹199</span>
                  <h3 className="text-lg font-semibold mb-1">AI for Beginners</h3>
                  <p className="text-gray-300 text-sm">Education</p>
                  <small className="text-gray-400 text-xs mt-2">Login required</small>
                </div>
              </Link>

              <Link to="/login" className="book-card locked glass rounded-2xl overflow-hidden relative h-32">
                <div className="lock-bg absolute inset-0 bg-black/60"></div>
                <div className="overlay absolute inset-0 p-4 flex flex-col justify-center">
                  <span className="price text-2xl font-bold text-yellow-400">₹99</span>
                  <h3 className="text-lg font-semibold mb-1">Topper's Notes</h3>
                  <p className="text-gray-300 text-sm">Handwritten</p>
                  <small className="text-gray-400 text-xs mt-2">Login required</small>
                </div>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Categories Section */}
      <section className="categories px-10 py-16 max-w-7xl mx-auto" id="marketplace">
        <div className="section-header flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Popular Categories</h2>
          <Link to="/explore" className="view-all text-blue-300 hover:text-white transition">View All →</Link>
        </div>
        <div className="categories-grid grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((cat, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              className="category-card glass rounded-xl p-6 text-center cursor-pointer"
            >
              <div className="category-icon text-4xl mb-3">{cat.icon}</div>
              <h3 className="font-semibold mb-1">{cat.name}</h3>
              <p className="text-gray-400 text-sm">{cat.count} Books</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Top Rated Books */}
      <section className="top-books px-10 py-16 max-w-7xl mx-auto">
        <div className="section-header flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Top Rated Books</h2>
          <Link to="/explore" className="view-all text-blue-300 hover:text-white transition">View All →</Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div id="featuredApprovedList" className="featured-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {books.length > 0 ? books.map(book => (
              <motion.div 
                key={book._id}
                whileHover={{ y: -5 }}
                className="featured-card glass rounded-xl overflow-hidden"
              >
                <Link to={`/book/${book._id}`}>
                  <img 
                    src={book.coverUrl || (book.cover ? `${API_BASE}${book.cover}` : '/assets/covers/Ebook_AI.png')}
                    alt={book.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold mb-2 truncate">{book.title}</h3>
                    <p className="text-gray-400 text-sm mb-2">{book.category}</p>
                    <span className="price text-yellow-400 font-bold">{book.isFree || book.price === 0 ? 'FREE' : '₹' + book.price}</span>
                  </div>
                </Link>
              </motion.div>
            )) : (
              <div className="col-span-full text-center py-10 text-gray-400">
                No books available yet.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
