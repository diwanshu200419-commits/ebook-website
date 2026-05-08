import { motion } from 'framer-motion'
import { Sparkles, BookOpen, Zap, Brain, CheckCircle2, ArrowRight, ShieldCheck, BarChart3, Search, MessageSquare, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AITools() {
  const aiTools = [
    {
      icon: Sparkles,
      title: 'AI Content Reviewer',
      description: 'Instant quality scores and professional improvement suggestions for your manuscripts.',
      link: '/ai-review',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    {
      icon: Brain,
      title: 'Semantic Tagger',
      description: 'AI-driven category and keyword suggestions to maximize your asset visibility.',
      link: '/ai-categories',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10'
    },
    {
      icon: ShieldCheck,
      title: 'Originality Guard',
      description: 'Advanced neural networks scan your work to ensure 100% unique content.',
      link: '/ai-plagiarism',
      color: 'text-green-400',
      bg: 'bg-green-500/10'
    },
    {
      icon: MessageSquare,
      title: 'Smart Summarizer',
      description: 'Generate high-converting book descriptions and summaries in seconds.',
      link: '/ai-summarize',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10'
    }
  ]

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Advanced AI Ecosystem</span>
          </div>
          <h1 className="text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
            The Future of <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Creator Intelligence
            </span>
          </h1>
          <p className="text-xl text-gray-400 leading-relaxed font-medium">
            Supercharge your workflow with our proprietary AI tools designed specifically for digital knowledge creators.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {aiTools.map((tool, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card rounded-[32px] p-8 group hover:border-white/20 transition-all cursor-default"
            >
              <div className={`w-14 h-14 rounded-2xl ${tool.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                <tool.icon className={`w-7 h-7 ${tool.color}`} />
              </div>
              
              <h3 className="text-2xl font-black tracking-tighter mb-4 text-white">{tool.title}</h3>
              <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">{tool.description}</p>
              
              <Link
                to={tool.link}
                className="flex items-center gap-2 text-blue-400 font-black text-xs uppercase tracking-widest group-hover:gap-3 transition-all"
              >
                Access Tool <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* AI Stats / Info */}
        <div className="grid lg:grid-cols-2 gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-10 rounded-[40px] bg-gradient-to-br from-blue-600 to-purple-600 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] group-hover:bg-white/20 transition-all"></div>
            <div className="relative z-10">
              <h3 className="text-3xl font-black tracking-tighter text-white mb-6">AI Content Optimization</h3>
              <p className="text-white/80 text-lg mb-10 font-medium">Our neural networks analyze over 50 quality metrics to ensure your content meets global publishing standards.</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-4xl font-black text-white">99.8%</p>
                  <p className="text-white/60 text-xs font-black uppercase tracking-widest mt-1">Accuracy Rate</p>
                </div>
                <div>
                  <p className="text-4xl font-black text-white"><span className="text-white/50">&lt;</span> 2s</p>
                  <p className="text-white/60 text-xs font-black uppercase tracking-widest mt-1">Processing Time</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-[40px] p-10 flex flex-col justify-center"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter">Enterprise-Grade Security</h3>
            </div>
            <p className="text-gray-400 text-lg font-medium mb-10">Your intellectual property is safe. All AI processing happens in encrypted environments and your data is never used for training models without consent.</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/explore" className="px-8 py-4 rounded-2xl bg-white text-black font-black text-sm hover:bg-gray-200 transition-all">
                Explore Marketplace
              </Link>
              <Link to="/creator/upload" className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-sm hover:bg-white/10 transition-all">
                Start Creating
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
