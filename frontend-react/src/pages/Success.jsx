import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Download, Home, ArrowRight } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Success() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (sessionId) {
      verifyPayment()
    } else {
      setLoading(false)
    }
  }, [sessionId])

  const verifyPayment = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/payments/verify-session?session_id=${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.message || 'Payment verification failed')
      }
    } catch (err) {
      console.error('Verification error:', err)
      setError('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-12 w-full max-w-2xl text-center"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full"></div>
            <h2 className="text-2xl font-bold">Verifying Payment...</h2>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-3xl font-bold text-red-400">Verification Failed</h2>
            <p className="text-gray-400">{error}</p>
            <Link to="/cart" className="px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-semibold">
              Back to Cart
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
              className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-8"
            >
              <CheckCircle className="w-12 h-12 text-green-400" />
            </motion.div>
            
            <h1 className="text-4xl font-extrabold mb-4">Payment Successful!</h1>
            <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">
              Thank you for your purchase. Your books have been added to your library and are ready for download.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <Link
                to="/library"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/20"
              >
                <Download className="w-5 h-5" />
                Go to My Library
              </Link>
              <Link
                to="/"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
              >
                <Home className="w-5 h-5" />
                Back to Home
              </Link>
            </div>

            <Link
              to="/explore"
              className="mt-8 text-blue-400 hover:text-blue-300 flex items-center gap-2 font-medium"
            >
              Continue Shopping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}
