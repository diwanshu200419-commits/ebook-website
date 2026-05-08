import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BookOpen, TrendingUp, ShieldCheck, Zap, ArrowRight, Star, Sparkles, Download, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Home() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrendingBooks()
  }, [])

  const fetchTrendingBooks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/marketplace/trending?limit=8`)
      const data = await res.json()
      let fetchedBooks = data.books || [];
      
      // Keep only unique books, prioritize "AI Side Hustles for Students"
      const uniqueBooks = [];
      const titles = new Set();
      fetchedBooks.forEach(b => {
        const bookId = b.id || b._id;
        if (b.title === "AI Side Hustles for Students" || !titles.has(b.title)) {
          uniqueBooks.push({ ...b, _id: bookId });
          titles.add(b.title);
        }
      });
      setBooks(uniqueBooks)
    } catch (err) {
      console.error('Error fetching trending books:', err)
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    { name: 'Business', icon: '💼', count: '1.2K', color: 'from-blue-500/20 to-blue-600/20' },
    { name: 'AI & Tech', icon: '🤖', count: '1.8K', color: 'from-purple-500/20 to-purple-600/20' },
    { name: 'Comics', icon: '🎨', count: '800+', color: 'from-pink-500/20 to-pink-600/20' },
    { name: 'Programming', icon: '💻', count: '2.5K', color: 'from-indigo-500/20 to-indigo-600/20' },
    { name: 'Education', icon: '🎓', count: '3K+', color: 'from-green-500/20 to-green-600/20' },
    { name: 'Self Help', icon: '🧠', count: '1.5K', color: 'from-orange-500/20 to-orange-600/20' }
  ]

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-32 pb-20 px-4 md:px-8 lg:px-12 overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 left-1/4 w-[30vw] h-[30vw] bg-blue-600/10 rounded-full blur-[120px] -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[30vw] h-[30vw] bg-purple-600/10 rounded-full blur-[120px] -z-10 animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
          {/* Hero Left */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-3/5 text-center lg:text-left z-20"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-400 text-[10px] lg:text-sm font-black mb-8 tracking-widest uppercase"
            >
              <Sparkles className="w-4 h-4" />
              <span>THE FUTURE OF KNOWLEDGE ECONOMY</span>
            </motion.div>

            <h1 className="text-5xl md:text-7xl lg:text-[100px] xl:text-[110px] font-black tracking-tighter mb-8 leading-[0.9] text-white">
              World's Best <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent pb-2 inline-block">
                Knowledge
              </span> <br />
              Platform
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Create, publish and earn from books, notes, comics and AI-assisted content. 
              <span className="text-white font-bold"> Built in India. Used Worldwide.</span>
            </p>

            <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-12">
              <Link 
                to="/explore" 
                className="group relative px-8 py-4 rounded-2xl bg-white text-black font-black text-lg flex items-center gap-2 hover:bg-gray-200 transition-all shadow-2xl shadow-white/10"
              >
                Explore Books
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/creator/upload" 
                className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-lg hover:bg-white/10 transition-all"
              >
                Become a Creator
              </Link>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-gray-800 overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" />
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <p className="text-white font-black text-sm leading-none">50K+</p>
                  <p className="text-gray-500 text-xs">Active Creators</p>
                </div>
              </div>
              <div className="h-10 w-px bg-white/10 hidden sm:block"></div>
              <div className="flex items-center gap-2 text-yellow-400">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <span className="text-white font-black">4.9/5</span>
                <span className="text-gray-500 text-sm">Rating</span>
              </div>
            </div>
          </motion.div>

          {/* Hero Right */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full lg:w-2/5 relative min-h-[400px] lg:min-h-[550px] flex items-center justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[400px] lg:max-w-[450px] aspect-[4/5]">
              {/* Main Book Cover - The "AI Side Hustles" one */}
              <motion.div
                whileHover={{ y: -10, rotate: -2 }}
                className="absolute top-0 left-0 w-[75%] z-10 glass rounded-[32px] p-3 lg:p-4 shadow-2xl overflow-hidden"
              >
                <img src="/assets/covers/Ebook_AI.png" className="w-full h-full object-cover rounded-2xl shadow-2xl" alt="Book" />
              </motion.div>

              {/* Secondary Book Cover */}
              <motion.div
                whileHover={{ y: -10, rotate: 2 }}
                className="absolute bottom-0 right-0 w-[75%] z-0 glass rounded-[32px] p-3 lg:p-4 shadow-2xl grayscale opacity-40"
              >
                <img src="/assets/covers/Ebook_AI.png" className="w-full h-full object-cover rounded-2xl shadow-2xl" alt="Book" />
              </motion.div>
              
              {/* Floating Revenue Card - Repositioned to not block center */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-6 top-[20%] z-20 glass-card p-5 rounded-3xl border-white/20 shadow-2xl min-w-[200px] hidden sm:block"
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Revenue</p>
                    <p className="text-xl font-black text-white">₹1.2M+</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                  </div>
                </div>
              </motion.div>

              {/* Floating User Card */}
              <motion.div
                animate={{ y: [0, 15, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -left-10 bottom-[20%] z-20 glass-card p-4 rounded-2xl border-white/20 shadow-2xl hidden sm:block"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">50K+</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase">Creators</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: 'Total Books', value: '12K+', icon: BookOpen },
            { label: 'Total Sales', value: '₹4.5M+', icon: Zap },
            { label: 'Verified Creators', value: '50K+', icon: ShieldCheck },
            { label: 'Happy Readers', value: '1M+', icon: Users }
          ].map((stat, i) => (
            <div key={i} className="text-center lg:text-left group">
              <div className="flex items-center justify-center lg:justify-start gap-4 mb-2">
                <stat.icon className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                <h3 className="text-4xl font-black tracking-tighter">{stat.value}</h3>
              </div>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-4">Popular Categories</h2>
              <p className="text-gray-400 text-lg">Explore a wide range of topics and formats</p>
            </div>
            <Link to="/explore" className="group flex items-center gap-2 text-white font-bold hover:text-blue-400 transition-colors">
              View All Categories <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((cat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8, scale: 1.05 }}
                className={`relative overflow-hidden rounded-[32px] bg-white/[0.02] border border-white/5 p-8 flex flex-col items-center justify-center text-center cursor-pointer group hover:border-white/20 transition-all min-h-[180px]`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                <div className="relative z-10">
                  <span className="text-5xl mb-4 block group-hover:scale-125 transition-transform duration-500">{cat.icon}</span>
                  <h3 className="font-black text-xl mb-1 group-hover:text-white transition-colors tracking-tight">{cat.name}</h3>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{cat.count} Books</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Books */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter">Trending Now</h2>
            <Link to="/explore" className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all text-sm font-bold">
              View Marketplace
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse space-y-4">
                  <div className="aspect-[3/4] bg-white/5 rounded-3xl"></div>
                  <div className="h-4 bg-white/5 rounded w-3/4"></div>
                  <div className="h-4 bg-white/5 rounded w-1/2"></div>
                </div>
              ))
            ) : (
              books.map((book) => (
                <motion.div
                  key={book._id}
                  whileHover={{ y: -10 }}
                  className="group relative bg-white/[0.02] border border-white/5 rounded-[32px] p-4 hover:border-white/20 transition-all"
                >
                  <Link to={`/book/${book.id || book._id}`}>
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-6">
                      <img 
                        src={book.cover || (book.coverImage ? (book.coverImage.startsWith('http') ? book.coverImage : `${API_BASE}${book.coverImage}`) : '/assets/covers/Ebook_AI.png')} 
                        alt={book.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
                        <div className="w-full py-3 rounded-xl bg-white text-black font-black text-sm flex items-center justify-center gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          <Download className="w-4 h-4" /> Get This Book
                        </div>
                      </div>
                      {book.price === 0 && (
                        <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-green-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl">
                          Free
                        </span>
                      )}
                    </div>
                    <div className="px-2">
                      <h3 className="text-xl font-black mb-1 truncate group-hover:text-blue-400 transition-colors">{book.title}</h3>
                      <p className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wider">{book.creator || book.authorName}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-black text-white">
                          {book.price === 0 ? 'FREE' : `₹${book.price}`}
                        </p>
                        <div className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-white font-black text-sm">4.9</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto relative rounded-[40px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          
          <div className="relative z-10 p-12 lg:p-20 text-center">
            <h2 className="text-4xl lg:text-6xl font-black tracking-tighter text-white mb-8">
              Ready to Share Your <br /> Knowledge?
            </h2>
            <p className="text-white/80 text-xl mb-12 max-w-2xl mx-auto">
              Join 50,000+ creators who are already selling their books, notes, and comics on the world's fastest-growing marketplace.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/creator/upload" className="px-10 py-5 rounded-2xl bg-white text-black font-black text-xl hover:scale-105 transition-all shadow-2xl">
                Get Started for Free
              </Link>
              <Link to="/explore" className="px-10 py-5 rounded-2xl bg-black/20 text-white font-black text-xl border border-white/20 hover:bg-black/30 transition-all">
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <Link to="/" className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="font-black text-2xl tracking-tighter">E-BOOK MARKET</span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed">
              The ultimate marketplace for digital knowledge. Sell your books, notes, comics and more with AI-powered review and global reach.
            </p>
          </div>
          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-widest text-xs">Marketplace</h4>
            <ul className="space-y-4 text-gray-500 text-sm font-bold">
              <li><Link to="/explore" className="hover:text-white transition-colors">All Books</Link></li>
              <li><Link to="/explore" className="hover:text-white transition-colors">Trending</Link></li>
              <li><Link to="/explore" className="hover:text-white transition-colors">Categories</Link></li>
              <li><Link to="/explore" className="hover:text-white transition-colors">Free Assets</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-widest text-xs">Creators</h4>
            <ul className="space-y-4 text-gray-500 text-sm font-bold">
              <li><Link to="/creator/upload" className="hover:text-white transition-colors">Start Selling</Link></li>
              <li><Link to="/creator" className="hover:text-white transition-colors">Creator Dashboard</Link></li>
              <li><Link to="/creator" className="hover:text-white transition-colors">Earnings</Link></li>
              <li><Link to="/creator" className="hover:text-white transition-colors">AI Review Guide</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-widest text-xs">Newsletter</h4>
            <p className="text-gray-500 text-sm mb-6 font-bold">Get the latest knowledge delivered to your inbox.</p>
            <div className="relative">
              <input 
                type="email" 
                placeholder="email@example.com" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-blue-500"
              />
              <button className="absolute right-2 top-1.5 p-1.5 rounded-lg bg-blue-600 text-white">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600 text-xs font-bold uppercase tracking-widest">
          <p>© 2026 E-BOOK MARKET. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="#" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
