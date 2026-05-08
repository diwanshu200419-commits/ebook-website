import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Explore from './pages/Explore'
import AITools from './pages/AITools'
import Library from './pages/Library'
import Dashboard from './pages/Dashboard'
import Creator from './pages/Creator'
import Admin from './pages/Admin'
import Settings from './pages/Settings'
import Cart from './pages/Cart'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/marketplace" element={<Explore />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/ai-tools" element={<AITools />} />
          <Route path="/library" element={<Library />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/creator" element={<Creator />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/ai-review" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">AI Review Coming Soon</h1></div>} />
          <Route path="/checkout" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">Checkout Coming Soon</h1></div>} />
          <Route path="/book/:id" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">Book View Coming Soon</h1></div>} />
          <Route path="*" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">Page Not Found</h1></div>} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
