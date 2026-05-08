import { motion } from 'framer-motion'
import { Settings as SettingsIcon, User, Bell, CreditCard, Lock, Shield, LogOut } from 'lucide-react'
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
    { icon: User, title: 'Profile Settings', description: 'Update your profile information and avatar' },
    { icon: Bell, title: 'Notifications', description: 'Manage your notification preferences' },
    { icon: CreditCard, title: 'Payment Methods', description: 'Add or remove payment methods' },
    { icon: Shield, title: 'Privacy & Security', description: 'Manage your privacy settings' },
    { icon: Lock, title: 'Change Password', description: 'Update your account password' }
  ]

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-extrabold">Settings</h1>
          </div>
          <p className="text-gray-400 text-lg">Manage your account preferences</p>
        </motion.div>

        <div className="bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-50"></div>
              <img
                src={user?.avatar || 'https://ebook-website-theta-nine.vercel.app/assets/default-avatar.png'}
                alt={user?.name}
                className="w-24 h-24 rounded-full object-cover relative z-10 border-4 border-white/20"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.name || 'User'}</h2>
              <p className="text-gray-400">{user?.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded-full capitalize">
                {user?.role || 'Reader'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {settingsSections.map((section, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="w-full text-left bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-2xl p-6 hover:from-white/10 hover:to-white/5 transition-all hover:border-blue-500/30"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1">{section.title}</h3>
                  <p className="text-gray-400">{section.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
        >
          <LogOut className="w-6 h-6" />
          <span className="font-semibold text-lg">Logout</span>
        </button>
      </div>
    </div>
  )
}
