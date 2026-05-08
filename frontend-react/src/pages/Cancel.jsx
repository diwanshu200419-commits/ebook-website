import { motion } from 'framer-motion'
import { XCircle, ShoppingCart, Home, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Cancel() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-3xl p-12 w-full max-w-2xl text-center"
      >
        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-8 mx-auto">
          <XCircle className="w-12 h-12 text-red-400" />
        </div>
        
        <h1 className="text-4xl font-extrabold mb-4">Payment Cancelled</h1>
        <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">
          Your payment was not completed. No charges were made to your account. You can try again whenever you're ready.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            to="/cart"
            className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/20"
          >
            <ShoppingCart className="w-5 h-5" />
            Return to Cart
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
          Explore Marketplace <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  )
}
