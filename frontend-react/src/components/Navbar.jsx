import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ShoppingCart,
  Bell,
  Menu,
  X,
  ChevronDown,
  User,
  BookOpen,
  Sparkles,
  Library,
  LayoutDashboard,
  Settings,
  LogOut,
  Moon,
  Sun
} from 'lucide-react'
import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [cartCount, setCartCount] = useState(0)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (user) {
      fetchCartCount()
    }
  }, [user])

  const fetchCartCount = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setCartCount(data.cart?.items?.length || 0)
      }
    } catch (err) {
      console.error('Cart count error:', err)
    }
  }

  const handleLogout = () => {
    logout()
    setIsProfileOpen(false)
    navigate('/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
    }
  }

  const isActive = (path) => location.pathname === path

  const navItems = [
    { path: '/', label: 'Home', icon: BookOpen },
    { path: '/explore', label: 'Marketplace', icon: Sparkles },
    { path: '/ai-tools', label: 'AI Tools', icon: Sparkles },
    { path: '/library', label: 'My Library', icon: Library }
  ]

  const dashboardItems = [
    { path: '/dashboard', label: 'User Dashboard', icon: LayoutDashboard },
    { path: '/creator', label: 'Creator Dashboard', icon: Sparkles },
    { path: '/admin', label: 'Admin Dashboard', icon: Settings, adminOnly: true },
    { path: '/settings', label: 'Settings', icon: Settings }
  ]

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-black/60 backdrop-blur-2xl border-b border-white/5 py-3 shadow-2xl shadow-black/50' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* LEFT - Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 relative z-10">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </motion.div>
          <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent group-hover:to-white transition-all duration-500">
            E-BOOK MARKET
          </span>
        </Link>

        {/* CENTER - Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 group ${
                isActive(item.path)
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {isActive(item.path) && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/10 rounded-full border border-white/10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {isActive(item.path) && <item.icon className="w-4 h-4 text-blue-400" />}
                {item.label}
              </span>
            </Link>
          ))}

          {/* Dashboard Dropdown */}
          {user && (
            <div className="relative ml-2">
              <button
                onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  isActive('/dashboard') || isActive('/creator') || isActive('/admin')
                    ? 'text-white bg-white/10 border border-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Dashboard
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${isDashboardOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isDashboardOpen && (
                  <>
                    <div className="fixed inset-0 z-0" onClick={() => setIsDashboardOpen(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full left-0 mt-3 w-64 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10"
                    >
                      <div className="p-2">
                        {dashboardItems
                          .filter(item => !item.adminOnly || user?.role === 'admin')
                          .map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setIsDashboardOpen(false)}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all group text-gray-400 hover:text-white"
                            >
                              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-blue-500/20 transition-colors">
                                <item.icon className="w-4 h-4 text-blue-400" />
                              </div>
                              <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                          ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

        {/* RIGHT - Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="hidden xl:flex relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="relative z-10 w-48 focus:w-64 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
          </form>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* Cart */}
          {user && (
            <Link
              to="/cart"
              className="relative p-2 rounded-full hover:bg-white/10 transition-all text-gray-400 hover:text-white group"
            >
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full text-[10px] font-black text-white flex items-center justify-center border-2 border-black"
                >
                  {cartCount}
                </motion.span>
              )}
            </Link>
          )}

          {/* Profile / Auth */}
          {user ? (
            <div className="relative ml-2">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-all border border-white/5"
              >
                <div className="relative">
                  <img
                    src={user.avatar || '/assets/default-avatar.png'}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-white/20 shadow-lg"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
                </div>
                <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-0" onClick={() => setIsProfileOpen(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-3 w-72 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10"
                    >
                      <div className="p-5 border-b border-white/5 bg-white/5">
                        <div className="flex items-center gap-4">
                          <img
                            src={user.avatar || '/assets/default-avatar.png'}
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover border border-white/20"
                          />
                          <div className="overflow-hidden">
                            <p className="font-bold text-white truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <Link
                          to="/dashboard"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all group text-gray-400 hover:text-white"
                        >
                          <LayoutDashboard className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium">My Dashboard</span>
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all group text-gray-400 hover:text-white"
                        >
                          <Settings className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-medium">Settings</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-all group text-gray-400 hover:text-red-400"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm font-medium">Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="px-5 py-2 rounded-full text-sm font-bold text-gray-400 hover:text-white transition-all"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-6 py-2 rounded-full text-sm font-black bg-white text-black hover:bg-gray-200 transition-all shadow-xl shadow-white/5"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 lg:hidden bg-black/95 backdrop-blur-3xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <span className="font-black text-xl tracking-tighter">E-BOOK MARKET</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-full bg-white/5">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
              </form>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-4 mb-2">Navigation</p>
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                      isActive(item.path)
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-bold text-lg">{item.label}</span>
                  </Link>
                ))}
              </div>

              {user && (
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-4 mb-2">Account</p>
                  {dashboardItems
                    .filter(item => !item.adminOnly || user?.role === 'admin')
                    .map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-4 px-6 py-4 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-bold text-lg">{item.label}</span>
                      </Link>
                    ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-white/2">
              {user ? (
                <button
                  onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-red-500/10 text-red-400 font-bold"
                >
                  <LogOut className="w-5 h-5" /> Logout
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center py-4 rounded-2xl bg-white/5 text-white font-bold"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center py-4 rounded-2xl bg-white text-black font-black"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
