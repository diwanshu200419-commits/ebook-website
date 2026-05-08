import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Explore from './pages/Explore'

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
          <Route path="/ai-tools" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">AI Tools Coming Soon</h1></div>} />
          <Route path="/library" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">My Library Coming Soon</h1></div>} />
          <Route path="/dashboard" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">Dashboard Coming Soon</h1></div>} />
          <Route path="/creator" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">Creator Dashboard Coming Soon</h1></div>} />
          <Route path="/admin" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">Admin Dashboard Coming Soon</h1></div>} />
          <Route path="/settings" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">Settings Coming Soon</h1></div>} />
          <Route path="/cart" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">Cart Coming Soon</h1></div>} />
          <Route path="*" element={<div className="min-h-screen flex items-center justify-center pt-20"><h1 className="text-4xl">Page Not Found</h1></div>} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
