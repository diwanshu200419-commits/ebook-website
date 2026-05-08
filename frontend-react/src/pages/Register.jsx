import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import { User, Mail, Lock, BookOpen, Sparkles, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('reader')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, setUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await register(name, email, password, role)
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.message || 'Registration failed. Please try again.')
    }
    setLoading(false)
  }

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/api/auth/google`
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-32 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] -z-10"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center"
      >
        {/* Left Side - Content */}
        <div className="hidden lg:block space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Join the knowledge revolution</span>
            </div>
            <h1 className="text-7xl font-black tracking-tighter leading-[0.9] mb-6">
              Start Your <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Journey
              </span> <br />
              Today.
            </h1>
            <p className="text-xl text-gray-400 max-w-md leading-relaxed font-medium">
              Access thousands of premium digital assets or start selling your own work to a global audience.
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              { title: 'Global Reach', desc: 'Sell to customers in over 190 countries.', icon: ShieldCheck },
              { title: 'AI Verification', desc: 'Get your content verified for quality instantly.', icon: Sparkles },
              { title: 'Secure Payments', desc: 'Direct payouts via Stripe and global gateways.', icon: Lock }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + (i * 0.1) }}
                className="flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                  <item.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-black text-lg text-white">{item.title}</h4>
                  <p className="text-gray-500 text-sm font-medium">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side - Form */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-[40px] p-10 lg:p-12 relative"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-4xl font-black tracking-tighter mb-2">Create Account</h2>
            <p className="text-gray-500 font-medium">Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Sign In</Link></p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl mb-8 text-sm font-bold flex items-center gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">!</div>
              {error}
            </motion.div>
          )}

          <div className="space-y-4 mb-8">
            <button 
              onClick={handleGoogleLogin}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center gap-4 hover:bg-white/10 transition-all font-black text-sm uppercase tracking-widest"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Continue with Google
            </button>
            
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center px-2">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.2em]">
                <span className="bg-[#050505] px-4 text-gray-600">Or use email</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-all font-bold"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-all font-bold"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Choose Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-all font-bold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">I want to</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('reader')}
                  className={`py-4 rounded-2xl border transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${role === 'reader' ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'}`}
                >
                  <BookOpen className="w-4 h-4" /> Learn
                </button>
                <button
                  type="button"
                  onClick={() => setRole('creator')}
                  className={`py-4 rounded-2xl border transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${role === 'creator' ? 'bg-purple-600 border-purple-600 text-white shadow-xl shadow-purple-600/20' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'}`}
                >
                  <Sparkles className="w-4 h-4" /> Create
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-white text-black font-black text-lg hover:bg-gray-200 transition-all shadow-2xl shadow-white/10 disabled:opacity-50 flex items-center justify-center gap-3 group"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /> Create Account</>}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] px-4">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
