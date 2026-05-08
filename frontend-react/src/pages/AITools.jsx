import { motion } from 'framer-motion'
import { Sparkles, BookOpen, Zap, Brain, CheckCircle2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AITools() {
  const aiTools = [
    {
      icon: Sparkles,
      title: 'AI Book Review',
      description: 'Get instant AI-powered reviews and quality scores for your books',
      link: '/ai-review',
      color: 'from-blue-500 to-purple-600'
    },
    {
      icon: Brain,
      title: 'Smart Category Suggestions',
      description: 'AI suggests the best categories for your content',
      link: '/ai-categories',
      color: 'from-purple-500 to-pink-600'
    },
    {
      icon: Zap,
      title: 'Plagiarism Checker',
      description: 'Advanced AI scans your content for originality',
      link: '/ai-plagiarism',
      color: 'from-green-500 to-teal-600'
    },
    {
      icon: BookOpen,
      title: 'AI Content Enhancer',
      description: 'Improve your writing with AI suggestions',
      link: '/ai-enhance',
      color: 'from-orange-500 to-red-600'
    }
  ]

  return (
    <div className="min-h-screen pt-24 pb-16 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-6">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300 font-semibold">POWERED BY AI</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold mb-6">
            AI Tools for <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Smart Publishing
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Harness the power of AI to review, enhance, and optimize your content with professional-grade tools
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {aiTools.map((tool, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 p-8"
            >
              <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${tool.color} opacity-20 blur-3xl group-hover:opacity-30 transition-opacity`}></div>
              
              <div className="relative z-10">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <tool.icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold mb-3 text-white">{tool.title}</h3>
                <p className="text-gray-400 mb-6">{tool.description}</p>
                
                <Link
                  to={tool.link}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
                >
                  Try Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 border border-blue-500/20 rounded-3xl p-8 text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
            <h3 className="text-2xl font-bold">All Tools are Free to Try</h3>
          </div>
          <p className="text-gray-400 mb-6">Experience the power of AI without any commitment</p>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-500 hover:to-purple-500 transition-all"
          >
            Explore Marketplace
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
