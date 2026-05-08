import { motion } from 'framer-motion'
import { ShoppingCart, Trash2, BookOpen, CreditCard, ArrowRight, Loader2, ShieldCheck, Zap, ChevronLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Cart() {
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
        return
      }

      const res = await fetch(`${API_BASE}/api/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setCartItems(data.items || [])
      }
    } catch (err) {
      console.error('Fetch cart error:', err)
    } finally {
      setLoading(false)
    }
  }

  const removeItem = async (bookId) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/cart/${bookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setCartItems(prev => prev.filter(item => item.book?._id !== bookId))
      }
    } catch (err) {
      console.error('Remove item error:', err)
    }
  }

  const handleCheckout = async () => {
    try {
      setCheckoutLoading(true)
      const token = localStorage.getItem('token')
      const bookIds = cartItems.map(item => item.book?._id).filter(Boolean)
      
      const res = await fetch(`${API_BASE}/api/payments/create-checkout-cart`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ bookIds })
      })
      
      const data = await res.json()
      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        alert(data.message || 'Checkout failed')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      alert('Checkout error')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const total = cartItems.reduce((sum, item) => sum + (item.priceAtAdd || 0), 0)

  if (loading) return (
    <div className="min-h-screen pt-32 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Preparing Your Cart...</p>
    </div>
  )

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-5xl font-black tracking-tighter mb-2 flex items-center gap-4">
              Your Cart <span className="text-blue-500">({cartItems.length})</span>
            </h1>
            <p className="text-gray-400 text-lg font-medium">Review your items before securing your lifetime access.</p>
          </div>
          <Link to="/explore" className="flex items-center gap-2 text-gray-500 font-bold hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" /> Continue Shopping
          </Link>
        </div>

        {cartItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-32 glass-card rounded-[40px] border-dashed"
          >
            <div className="w-24 h-24 rounded-[32px] bg-white/2 flex items-center justify-center mx-auto mb-8">
              <ShoppingCart className="w-12 h-12 text-gray-700" />
            </div>
            <h3 className="text-3xl font-black mb-4">Your cart is empty</h3>
            <p className="text-gray-500 mb-10 max-w-md mx-auto font-medium">Looks like you haven't added any digital assets to your cart yet.</p>
            <Link
              to="/explore"
              className="px-10 py-5 rounded-2xl bg-white text-black font-black text-lg hover:bg-gray-200 transition-all shadow-2xl shadow-white/10"
            >
              Explore Marketplace
            </Link>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12">
            {/* Items List */}
            <div className="lg:col-span-8 space-y-6">
              {cartItems.map((item, idx) => {
                const book = item.book
                if (!book) return null
                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-card rounded-[32px] p-8 flex flex-col sm:flex-row items-center gap-8 group"
                  >
                    <div className="w-24 h-32 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0">
                      <img 
                        src={book.coverUrl || (book.coverImage ? (book.coverImage.startsWith('http') ? book.coverImage : `${API_BASE}${book.coverImage}`) : (book.cover ? (book.cover.startsWith('http') ? book.cover : `${API_BASE}${book.cover}`) : '/assets/covers/Ebook_AI.png'))} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        alt={book.title} 
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-2">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2 py-0.5 rounded-md bg-blue-400/10">
                          {book.category || 'Digital'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black mb-1 truncate group-hover:text-blue-400 transition-colors">{book.title}</h3>
                      <p className="text-gray-500 font-bold text-sm">by {book.authorName}</p>
                    </div>

                    <div className="flex items-center gap-8">
                      <p className="text-3xl font-black text-white">₹{item.priceAtAdd}</p>
                      <button 
                        onClick={() => removeItem(book._id)}
                        className="w-12 h-12 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all flex items-center justify-center"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}

              {/* Secure Info */}
              <div className="p-8 rounded-[32px] bg-blue-600/5 border border-blue-500/10 flex items-start gap-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-black text-lg mb-1">Secure Checkout</h4>
                  <p className="text-gray-500 text-sm leading-relaxed">Your transaction is protected by industry-leading encryption. Digital assets will be available for instant download in your library after successful payment.</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card rounded-[40px] p-10 sticky top-32"
              >
                <h3 className="text-2xl font-black tracking-tighter mb-8">Order Summary</h3>
                
                <div className="space-y-4 mb-10">
                  <div className="flex justify-between items-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                    <span>Subtotal</span>
                    <span className="text-white text-base font-black">₹{total}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                    <span>Platform Fee</span>
                    <span className="text-green-500 text-base font-black">FREE</span>
                  </div>
                  <div className="h-px bg-white/5 my-6"></div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">Total Amount</p>
                      <p className="text-4xl font-black text-white">₹{total}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Lifetime Access</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black text-xl hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-50 group"
                >
                  {checkoutLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <CreditCard className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  )}
                  Secure Checkout
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="mt-8 flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-gray-500">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Instant access after payment</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Download in high-quality PDF</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
