import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="nav glass fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-10 py-5"
    >
      <Link to="/" className="logo font-extrabold text-xl tracking-wide text-blue-300">
        E-BOOK MARKET
      </Link>

      <nav className="flex items-center gap-7">
        <Link to="/" className="text-gray-300 hover:text-white transition">Home</Link>
        <Link to="/explore" className="text-gray-300 hover:text-white transition">Marketplace</Link>
        <Link to="/ai-tools" className="text-gray-300 hover:text-white transition">AI Tools</Link>
        
        {user ? (
          <>
            <Link 
              to={user.role === 'admin' ? '/admin' : '/dashboard'} 
              className="btn-outline px-6 py-2 rounded-full border border-white/30 text-white hover:border-white transition"
            >
              Dashboard
            </Link>
            <button 
              onClick={() => { logout(); navigate('/') }}
              className="btn px-6 py-2 rounded-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link 
              to="/login" 
              className="btn-outline px-6 py-2 rounded-full border border-white/30 text-white hover:border-white transition"
            >
              Sign In
            </Link>
            <Link 
              to="/register" 
              className="btn px-6 py-2 rounded-full bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 transition"
            >
              Register
            </Link>
          </>
        )}
      </nav>
    </motion.header>
  )
}
