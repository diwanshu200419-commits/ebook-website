import { motion } from 'framer-motion'
import { Settings as SettingsIcon, User, Bell, CreditCard, Lock, Shield, LogOut, ChevronRight, Camera, Mail, Globe, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const settingsSections = [
    { icon: User, title: 'Profile Information', description: 'Update your display name and public bio', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: Mail, title: 'Email & Communications', description: 'Manage your primary email and newsletter', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { icon: Bell, title: 'Notification Preferences', description: 'Choose how you get notified about sales', color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { icon: CreditCard, title: 'Payout & Payments', description: 'Connect Stripe account or update card', color: 'text-green-400', bg: 'bg-green-500/10' },
    { icon: Lock, title: 'Security & Password', description: 'Update password and manage 2FA', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { icon: Globe, title: 'Region & Currency', description: 'Set your local currency and timezone', color: 'text-teal-400', bg: 'bg-teal-500/10' }
  ]

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl font-black tracking-tighter mb-2">Account Settings</h1>
          <p className="text-gray-400 text-lg">Manage your digital profile and platform preferences.</p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-12">
          {/* Left - Profile Card */}
          <div className="lg:col-span-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-[40px] p-10 text-center sticky top-32"
            >
              <div className="relative inline-block mb-8 group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <img
                  src={user?.avatar || '/assets/default-avatar.png'}
                  alt={user?.name}
                  className="w-32 h-32 rounded-full object-cover relative z-10 border-4 border-white/10"
                />
                <button className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-blue-600 border-4 border-[#050505] z-20 flex items-center justify-center text-white hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              
              <h2 className="text-2xl font-black tracking-tighter mb-1">{user?.name || 'Knowledge Creator'}</h2>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-widest mb-6">{user?.role || 'Reader'}</p>
              
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-8">
                <Sparkles className="w-3 h-3" /> AI Verified Account
              </div>

              <div className="h-px bg-white/5 mb-8"></div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-red-500/10 text-red-400 font-black text-sm uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
              >
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </motion.div>
          </div>

          {/* Right - Settings List */}
          <div className="lg:col-span-8 space-y-4">
            {settingsSections.map((section, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="w-full text-left glass-card rounded-3xl p-6 flex items-center gap-6 group hover:border-white/20 transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl ${section.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <section.icon className={`w-6 h-6 ${section.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">{section.title}</h3>
                  <p className="text-gray-500 text-sm font-medium">{section.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
              </motion.button>
            ))}

            <div className="mt-12 p-8 rounded-[32px] bg-white/2 border border-white/5">
              <h4 className="font-black text-lg mb-2">Delete Account</h4>
              <p className="text-gray-500 text-sm mb-6">Permanently remove your account and all your digital assets from E-BOOK MARKET.</p>
              <button className="text-red-500 font-black text-xs uppercase tracking-widest hover:underline">
                Request Deletion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
