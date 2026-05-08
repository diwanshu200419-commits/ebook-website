import { useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileText, Image as ImageIcon, Sparkles, CheckCircle, AlertCircle, Loader2, ArrowLeft, Info, HelpCircle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://ebook-website-v2mj.onrender.com'

export default function UploadBook() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Book',
    authorName: ''
  })
  const [pdf, setPdf] = useState(null)
  const [cover, setCover] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'success' | 'error', message: '', aiResult?: any }
  const navigate = useNavigate()

  const categories = [
    "Book", "Notes", "Study", "AI", "Comics", "Education", 
    "Technology", "Self Help", "Fiction", "Competitive", "Other"
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pdf) return setStatus({ type: 'error', message: 'Digital asset (PDF) is required.' })

    setLoading(true)
    setStatus(null)

    try {
      const data = new FormData()
      Object.keys(formData).forEach(key => data.append(key, formData[key]))
      data.append('pdf', pdf)
      if (cover) data.append('cover', cover)

      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/books/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: data
      })

      const result = await res.json()
      if (result.success) {
        setStatus({ 
          type: 'success', 
          message: 'Your asset has been published!',
          aiResult: result
        })
        setTimeout(() => navigate('/creator'), 3000)
      } else {
        setStatus({ type: 'error', message: result.message || 'Publishing failed. Please check your files.' })
      }
    } catch (err) {
      console.error('Upload error:', err)
      setStatus({ type: 'error', message: 'Secure connection to publishing server lost.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/creator" className="text-gray-500 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-5xl font-black tracking-tighter">Publish Asset</h1>
            </div>
            <p className="text-gray-400 text-lg">Upload your work and let our AI handle the quality review.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-bold text-sm hover:text-white transition-all flex items-center gap-2">
              <HelpCircle className="w-4 h-4" /> Creator Guide
            </button>
          </div>
        </div>

        {status && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-12 p-8 rounded-[32px] border ${
              status.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            <div className="flex items-start gap-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${status.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {status.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <p className="font-black text-2xl mb-2">{status.message}</p>
                {status.aiResult && (
                  <div className="mt-6 p-6 rounded-2xl bg-black/40 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-2 text-purple-400 font-black uppercase tracking-widest text-xs">
                        <Sparkles className="w-4 h-4" /> AI Review Analysis
                      </p>
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase">Verified</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-black text-white">{status.aiResult.aiScore}<span className="text-gray-600 text-lg">/100</span></div>
                      <div className="h-8 w-px bg-white/10"></div>
                      <div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Status</p>
                        <p className="text-white font-bold capitalize">{status.aiResult.aiStatus}</p>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm italic font-medium">"{status.aiResult.aiSuggestion}"</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-12 gap-12">
          {/* Main Form Fields */}
          <div className="lg:col-span-7 space-y-8">
            <div className="glass-card rounded-[40px] p-10 space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Asset Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-all font-bold text-lg"
                    placeholder="e.g. The Ultimate AI Masterclass"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Display Author Name</label>
                  <input
                    type="text"
                    required
                    value={formData.authorName}
                    onChange={e => setFormData({ ...formData, authorName: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-all font-bold"
                    placeholder="Your pen name or brand"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-all font-black text-xl text-yellow-400"
                      placeholder="0 for free"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-all font-bold appearance-none cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Full Description</label>
                  <textarea
                    rows="6"
                    required
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 focus:outline-none transition-all resize-none font-medium text-gray-300"
                    placeholder="Describe your work in detail. What will readers learn?"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* AI Review Info */}
            <div className="p-8 rounded-[32px] bg-purple-600/5 border border-purple-500/10 flex items-start gap-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h4 className="font-black text-lg mb-1">AI-Powered Quality Review</h4>
                <p className="text-gray-500 text-sm leading-relaxed">Our advanced AI will analyze your content for quality, originalty, and formatting. Assets with higher quality scores get 5x more visibility in the marketplace.</p>
              </div>
            </div>
          </div>

          {/* File Uploads Sidebar */}
          <div className="lg:col-span-5 space-y-8">
            <div className="glass-card rounded-[40px] p-10 space-y-8 sticky top-32">
              <h3 className="text-xl font-black mb-6 uppercase tracking-widest text-xs text-gray-500">Media & Files</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Asset PDF</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".pdf"
                      required
                      onChange={e => setPdf(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`p-10 rounded-[32px] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 text-center ${
                      pdf ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 group-hover:border-white/20 bg-white/2'
                    }`}>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${pdf ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-600'}`}>
                        <FileText className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="font-black text-sm truncate max-w-[200px]">{pdf ? pdf.name : 'Select Asset PDF'}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Maximum size 50MB</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">Cover Preview</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setCover(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`p-10 rounded-[32px] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 text-center ${
                      cover ? 'border-purple-500 bg-purple-500/5' : 'border-white/10 group-hover:border-white/20 bg-white/2'
                    }`}>
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${cover ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-600'}`}>
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="font-black text-sm truncate max-w-[200px]">{cover ? cover.name : 'Select Cover Image'}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">High-quality JPG or PNG</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-white text-black font-black text-xl hover:bg-gray-200 transition-all shadow-2xl shadow-white/10 disabled:opacity-50 group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                      Publish Asset
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-gray-600 font-black uppercase tracking-widest mt-4">
                  By publishing, you agree to our Content Guidelines.
                </p>
              </div>
            </div>

            {/* Support Info */}
            <div className="flex items-center gap-3 px-6 text-gray-600">
              <Info className="w-4 h-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Need help? Visit the creator academy.</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
