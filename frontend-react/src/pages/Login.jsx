import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, Sparkles, Loader2, ShieldCheck, Zap } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Handle Google Auth Token from Hash
    const hash = location.hash
    if (hash && hash.startsWith('#token=')) {
      const token = hash.split('=')[1]
      if (token) {
        handleGoogleSuccess(token)
      }
    }
  }, [location])

  const handleGoogleSuccess = async (token) => {
    try {
      localStorage.setItem('token', token)
      // Fetch user data with the token
      const res = await fetch(`${API_BASE}/api/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user)
        navigate('/dashboard')
      } else {
        setError('Google login failed to retrieve profile.')
      }
    } catch (err) {
      console.error('Google login error:', err)
      setError('Secure connection to Google failed.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.message || 'Invalid credentials. Please try again.')
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
              <Zap className="w-4 h-4" />
              <span>Welcome Back to E-Book Market</span>
            </div>
            <h1 className="text-7xl font-black tracking-tighter leading-[0.9] mb-6">
              Access Your <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Knowledge
              </span> <br />
              Vault.
            </h1>
            <p className="text-xl text-gray-400 max-w-md leading-relaxed font-medium">
              Log in to access your library, track your creator earnings, and explore the latest digital assets.
            </p>
          </motion.div>

          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h4 className="font-black text-white uppercase tracking-widest text-xs">Secure Access</h4>
              </div>
              <p className="text-gray-500 text-sm font-medium leading-relaxed">
                Your data is protected by bank-grade encryption and secure authentication protocols.
              </p>
            </div>
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
            <h2 className="text-4xl font-black tracking-tighter mb-2">Sign In</h2>
            <p className="text-gray-500 font-medium">New to the platform? <Link to="/register" className="text-blue-500 hover:underline">Create Account</Link></p>
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
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-all font-bold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="#" className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">Forgot Password?</Link>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-white text-black font-black text-lg hover:bg-gray-200 transition-all shadow-2xl shadow-white/10 disabled:opacity-50 flex items-center justify-center gap-3 group"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /> Sign In</>}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-gray-600 font-black uppercase tracking-[0.2em] px-4">
            Secured by E-BOOK MARKET Intelligence.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
