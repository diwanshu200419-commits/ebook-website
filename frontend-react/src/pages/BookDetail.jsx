import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, ShoppingCart, Download, User, Calendar, Tag, ArrowLeft, Star, ShieldCheck, Share2, Heart, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function BookDetail() {
  const { id } = useParams()
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addingToCart, setAddingToCart] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchBook()
    window.scrollTo(0, 0)
  }, [id])

  const fetchBook = async () => {
    try {
      // First try to fetch from the standard list
      const res = await fetch(`${API_BASE}/api/books`)
      const data = await res.json()
      let found = data.books?.find(b => (b._id || b.id) === id)
      
      // If not found, try the specific book endpoint
      if (!found) {
        const bookRes = await fetch(`${API_BASE}/api/books/${id}`)
        const bookData = await bookRes.json()
        if (bookData.success) {
          found = bookData.book
        }
      }

      if (found) {
        setBook(found)
      } else {
        setError('Asset not found in our database.')
      }
    } catch (err) {
      console.error('Error fetching book:', err)
      setError('Connection to secure server failed.')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async () => {
    try {
      setAddingToCart(true)
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }

      const res = await fetch(`${API_BASE}/api/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId: id })
      })
      const data = await res.json()
      if (data.success) {
        navigate('/cart')
      } else {
        alert(data.message)
      }
    } catch (err) {
      console.error('Add to cart error:', err)
      alert('Failed to update secure cart.')
    } finally {
      setAddingToCart(false)
    }
  }

  const handlePurchase = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }

      const res = await fetch(`${API_BASE}/api/payments/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bookId: id })
      })
      const data = await res.json()
      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        alert(data.message || 'Payment gateway initialization failed.')
      }
    } catch (err) {
      console.error('Purchase error:', err)
      alert('Secure checkout connection error.')
    }
  }

  if (loading) return (
    <div className="min-h-screen pt-32 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Securing Asset Details...</p>
    </div>
  )

  if (error || !book) return (
    <div className="min-h-screen pt-32 text-center px-6">
      <div className="w-24 h-24 rounded-[32px] bg-red-500/10 flex items-center justify-center mx-auto mb-8">
        <BookOpen className="w-12 h-12 text-red-400" />
      </div>
      <h2 className="text-4xl font-black mb-4 tracking-tighter">{error || 'Asset not found'}</h2>
      <p className="text-gray-500 mb-8 max-w-md mx-auto font-medium">The digital asset you are looking for might have been removed or moved to a different location.</p>
      <Link to="/explore" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-black font-black hover:bg-gray-200 transition-all">
        <ArrowLeft className="w-5 h-5" /> Back to Marketplace
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-4 mb-12">
          <Link to="/explore" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span className="text-gray-700">/</span>
            <Link to="/explore" className="hover:text-white transition-colors">Marketplace</Link>
            <span className="text-gray-700">/</span>
            <span className="text-blue-400">{book.category || 'Asset'}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-16">
          {/* Left - Visual Preview */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 xl:col-span-4"
          >
            <div className="sticky top-32">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-600/20 blur-[100px] rounded-full opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="relative z-10 aspect-[3/4] rounded-[40px] overflow-hidden bg-white/5 border border-white/10 shadow-2xl">
                  <img 
                    src={book.coverUrl || (book.coverImage ? (book.coverImage.startsWith('http') ? book.coverImage : `${API_BASE}${book.coverImage}`) : '/assets/covers/Ebook_AI.png')} 
                    alt={book.title} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-8 right-8 flex flex-col gap-3">
                    <button className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-red-500 hover:border-red-500 transition-all">
                      <Heart className="w-5 h-5" />
                    </button>
                    <button className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white hover:bg-blue-500 hover:border-blue-500 transition-all">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Asset Specs */}
              <div className="mt-12 grid grid-cols-2 gap-4">
                {[
                  { label: 'File Format', value: 'PDF', icon: Download },
                  { label: 'AI Score', value: '98/100', icon: ShieldCheck },
                  { label: 'Language', value: 'English', icon: MessageSquare },
                  { label: 'Updated', value: new Date(book.createdAt).toLocaleDateString(), icon: Calendar }
                ].map((spec, i) => (
                  <div key={i} className="p-6 rounded-3xl bg-white/2 border border-white/5 flex flex-col gap-3">
                    <spec.icon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{spec.label}</p>
                      <p className="text-white font-black">{spec.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right - Asset Information */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-7 xl:col-span-8"
          >
            <div className="flex flex-wrap gap-3 mb-8">
              <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-black uppercase tracking-widest border border-blue-500/20">
                {book.category || 'Digital Asset'}
              </span>
              <span className="px-4 py-1.5 rounded-full bg-green-500/10 text-green-400 text-xs font-black uppercase tracking-widest border border-green-500/20 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> AI Verified Content
              </span>
              <span className="px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-black uppercase tracking-widest border border-purple-500/20 flex items-center gap-2">
                <Star className="w-4 h-4 fill-current" /> 4.9 Rating
              </span>
            </div>

            <h1 className="text-6xl font-black tracking-tighter mb-6 leading-[0.9]">{book.title}</h1>
            
            <div className="flex items-center gap-4 mb-12">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-black text-white">
                {book.authorName[0]}
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Published By</p>
                <p className="text-xl font-black text-white">{book.authorName}</p>
              </div>
              <div className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Verified Seller</span>
              </div>
            </div>

            <div className="prose prose-invert max-w-none mb-12">
              <p className="text-2xl text-gray-400 leading-relaxed font-medium">
                {book.description || 'Elevate your knowledge with this premium digital asset. Expertly crafted and AI-reviewed for maximum quality and accuracy.'}
              </p>
            </div>

            {/* Pricing & CTA Card */}
            <div className="p-10 rounded-[40px] bg-gradient-to-br from-white/5 to-transparent border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[80px] -z-10"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-12">
                <div>
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Lifetime Access Price</p>
                  <p className="text-6xl font-black text-white">
                    {book.price === 0 ? 'FREE' : `₹${book.price}`}
                  </p>
                  {book.price !== 0 && <p className="text-green-500 font-bold text-sm mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Includes all future updates
                  </p>}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-md">
                  {book.price === 0 ? (
                    <button className="w-full py-5 rounded-2xl bg-white text-black font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-white/10 flex items-center justify-center gap-3">
                      <Download className="w-6 h-6" /> Download Now
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={addToCart}
                        disabled={addingToCart}
                        className="flex-1 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {addingToCart ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShoppingCart className="w-6 h-6" />}
                        Add to Cart
                      </button>
                      <button 
                        onClick={handlePurchase}
                        className="flex-1 py-5 rounded-2xl bg-blue-600 text-white font-black text-xl hover:bg-blue-500 hover:scale-105 transition-all shadow-2xl shadow-blue-600/20"
                      >
                        Buy Now
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Features */}
            <div className="mt-16 grid sm:grid-cols-3 gap-8 border-t border-white/5 pt-16">
              {[
                { title: 'Secure Access', desc: 'Encrypted downloads and secure payment processing.', icon: ShieldCheck },
                { title: 'Instant Delivery', desc: 'Get immediate access to your assets after purchase.', icon: Zap },
                { title: 'AI Optimized', desc: 'Content analyzed for clarity, quality and originality.', icon: BookOpen }
              ].map((feature, i) => (
                <div key={i}>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h4 className="font-black text-xl mb-2">{feature.title}</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
