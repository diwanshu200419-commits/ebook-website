import { motion } from 'framer-motion'
import { ShoppingCart, Trash2, Plus, Minus, BookOpen, CreditCard, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Cart() {
  const cartItems = [
    { id: 1, title: 'AI for Beginners', author: 'Tech Academy', price: 199, quantity: 1 },
    { id: 2, title: 'Topper\'s Notes', author: 'Top Students', price: 99, quantity: 2 }
  ]

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCart className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-extrabold">Shopping Cart</h1>
          </div>
          <p className="text-gray-400 text-lg">{cartItems.length} items in your cart</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6"
              >
                <div className="w-24 h-32 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-10 h-10 text-blue-400" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                  <p className="text-gray-400 mb-4">{item.author}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl p-1">
                      <button className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xl font-bold text-yellow-400">₹{item.price * item.quantity}</span>
                  </div>
                </div>

                <button className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors flex-shrink-0">
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            ))}

            {cartItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-12 text-center"
              >
                <ShoppingCart className="w-20 h-20 text-gray-600 mx-auto mb-6" />
                <h3 className="text-2xl font-bold mb-4">Your cart is empty</h3>
                <p className="text-gray-400 mb-8">Add some amazing books to get started</p>
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
                >
                  Explore Books
                </Link>
              </motion.div>
            )}
          </div>

          {cartItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-1"
            >
              <div className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-6 sticky top-24">
                <h3 className="text-2xl font-bold mb-6">Order Summary</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>₹{total}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Tax (5%)</span>
                    <span>₹{Math.round(total * 0.05)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-4 flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-yellow-400">₹{total + Math.round(total * 0.05)}</span>
                  </div>
                </div>

                <Link
                  to="/checkout"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
                >
                  <CreditCard className="w-5 h-5" />
                  Proceed to Checkout
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
