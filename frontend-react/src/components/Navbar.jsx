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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-black/80 backdrop-blur-xl border-b border-white/10 py-3' 
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
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition"></div>
            <BookOpen className="w-8 h-8 text-blue-400 relative z-10" />
          </motion.div>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            E-BOOK MARKET
          </span>
        </Link>

        {/* CENTER - Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 group ${
                isActive(item.path)
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {isActive(item.path) && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
              {isActive(item.path) && (
                <motion.div
                  layoutId="activeUnderline"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
              )}
            </Link>
          ))}

          {/* Dashboard Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setIsDashboardOpen(!isDashboardOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  isActive('/dashboard') || isActive('/creator') || isActive('/admin')
                    ? 'text-white bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Dashboard
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isDashboardOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {isDashboardOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    onMouseLeave={() => setIsDashboardOpen(false)}
                    className="absolute top-full left-0 mt-2 w-64 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-2">
                      {dashboardItems
                        .filter(item => !item.adminOnly || user?.role === 'admin')
                        .map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsDashboardOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
                          >
                            <item.icon className="w-5 h-5 text-blue-400" />
                            {item.label}
                          </Link>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>

        {/* RIGHT - Actions */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex relative">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur"></div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search books, notes, comics..."
                className="relative z-10 w-64 pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
            </div>
          </form>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2.5 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* Cart */}
          {user && (
            <Link
              to="/cart"
              className="relative p-2.5 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white group"
            >
              <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-xs font-bold text-white flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </Link>
          )}

          {/* Notifications */}
          {user && (
            <button className="relative p-2.5 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white group">
              <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>
          )}

          {/* Auth Buttons / Profile */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 p-1.5 pl-2 rounded-full hover:bg-white/10 transition-all"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-50"></div>
                  <img
                    src={user.avatar || 'https://ebook-website-theta-nine.vercel.app/assets/default-avatar.png'}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover relative z-10 border-2 border-white/20"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black z-20"></span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-white">{user.name}</p>
                  <p className="text-xs text-blue-400 capitalize">{user.role || 'Reader'}</p>
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    onMouseLeave={() => setIsProfileOpen(false)}
                    className="absolute top-full right-0 mt-2 w-72 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || 'https://ebook-website-theta-nine.vercel.app/assets/default-avatar.png'}
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                        />
                        <div>
                          <p className="font-semibold text-white">{user.name}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full capitalize">
                            {user.role || 'Reader'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/dashboard"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
                      >
                        <LayoutDashboard className="w-5 h-5 text-blue-400" />
                        Dashboard
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
                      >
                        <Settings className="w-5 h-5 text-blue-400" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors text-gray-300 hover:text-red-400"
                      >
                        <LogOut className="w-5 h-5" />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-3">
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-full font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="relative px-6 py-2.5 rounded-full font-semibold text-white overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:from-blue-500 group-hover:to-purple-500 transition-all"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <span className="relative z-10">Get Started</span>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-black/98 backdrop-blur-xl border-t border-white/10 overflow-hidden"
          >
            <div className="p-6 space-y-2">
              <form onSubmit={handleSearch} className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search books..."
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </form>

              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive(item.path)
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              ))}

              {user && (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  {dashboardItems
                    .filter(item => !item.adminOnly || user?.role === 'admin')
                    .map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"
                      >
                        <item.icon className="w-5 h-5 text-blue-400" />
                        {item.label}
                      </Link>
                    ))}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              )}

              {!user && (
                <div className="pt-4 border-t border-white/10 space-y-3">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 rounded-xl border border-white/20 text-center font-medium text-gray-300 hover:text-white hover:border-white/40"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-center font-semibold text-white"
                  >
                    Get Started
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
