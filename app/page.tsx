'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, CheckCircle, X, Clock, Zap, Github, FileText, Calendar, Users } from 'lucide-react'
import { daysUntil } from '@/lib/utils'

const ENFORCEMENT_DATE = '2026-08-02'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const daysLeft = daysUntil(ENFORCEMENT_DATE)

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setTimeout(() => {
      if (email === 'admin@complianceforge.ai' && password === 'demo123') {
        localStorage.setItem('cf_user', JSON.stringify({ email, name: 'Admin User', org: 'Demo Organization' }))
        router.push('/dashboard')
      } else {
        setError('Invalid credentials. Use admin@complianceforge.ai / demo123')
        setLoading(false)
      }
    }, 800)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-600 rounded-full opacity-8 blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-violet-600 rounded-full opacity-8 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Nav */}
        <nav className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">ComplianceForge</span>
              <span className="text-indigo-400">.ai</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="https://github.com/gengirish/complianceforge" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
              <Github className="w-4 h-4" /> GitHub
            </a>
          </div>
        </nav>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Hero */}
          <div>
            {/* Urgency pill */}
            <div className="inline-flex items-center gap-2 bg-red-950 border border-red-800 text-red-300 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Clock className="w-4 h-4" />
              <span>{daysLeft} days until August 2, 2026 enforcement deadline</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
              Enterprise EU AI Act{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                Compliance.
              </span>
              <br />
              <span className="text-3xl md:text-4xl font-bold text-slate-300">SMB Price.</span>
            </h1>

            <p className="text-xl text-slate-400 mb-10 leading-relaxed">
              Stop paying €200k+ for compliance consultants. ComplianceForge gives you IBM-grade EU AI Act compliance tools for €49/month. GitHub scanner, AI risk classification, compliance certificates — all in one platform.
            </p>

            {/* Key features */}
            <div className="grid grid-cols-2 gap-3 mb-10">
              {[
                { icon: Github, label: 'GitHub Repo Scanner' },
                { icon: Zap, label: 'Gemini AI Classification' },
                { icon: FileText, label: 'Compliance Certificates' },
                { icon: Calendar, label: 'Deadline Alerts' },
                { icon: Shield, label: '113 Articles Tracked' },
                { icon: Users, label: 'Team Collaboration' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Comparison Table */}
            <div id="pricing" className="border border-slate-800 rounded-2xl overflow-hidden">
              <div className="bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Why ComplianceForge?
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left p-3 text-slate-400 font-medium"></th>
                      <th className="p-3 text-slate-400 font-medium">IBM OpenScale</th>
                      <th className="p-3 text-slate-400 font-medium">Deloitte Audit</th>
                      <th className="p-3 text-indigo-400 font-bold bg-indigo-950/30">ComplianceForge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Price', '€200k+/yr', '€50k project', '€49/mo'],
                      ['AI Classification', 'Manual', 'Consultant', 'Gemini AI'],
                      ['GitHub Scanner', false, false, true],
                      ['Certificate PDF', true, true, true],
                      ['Time to comply', '6 months', '3 months', '1 hour'],
                    ].map(([label, ibm, deloitte, cf]) => (
                      <tr key={label as string} className="border-b border-slate-800/50">
                        <td className="p-3 text-slate-300 font-medium">{label}</td>
                        <td className="p-3 text-center text-slate-500">
                          {typeof ibm === 'boolean' ? (ibm ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-red-500 mx-auto" />) : ibm}
                        </td>
                        <td className="p-3 text-center text-slate-500">
                          {typeof deloitte === 'boolean' ? (deloitte ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-red-500 mx-auto" />) : deloitte}
                        </td>
                        <td className="p-3 text-center bg-indigo-950/20 text-indigo-300 font-medium">
                          {typeof cf === 'boolean' ? (cf ? <CheckCircle className="w-4 h-4 text-indigo-400 mx-auto" /> : <X className="w-4 h-4 text-red-500 mx-auto" />) : cf}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="mt-6 text-xs text-slate-600 text-center">
              BuildwithAiGiri Series — by Girish B. Hiremath | intelliforge.digital
            </p>
          </div>

          {/* Right: Login form */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Welcome back</h2>
                  <p className="text-slate-400 mt-1">Sign in to your compliance dashboard</p>
                </div>

                {/* Demo credentials hint */}
                <div className="bg-indigo-950/50 border border-indigo-800/50 rounded-xl p-4 mb-6">
                  <p className="text-indigo-300 text-sm font-medium mb-1">Demo Access</p>
                  <p className="text-indigo-400 text-xs">Email: admin@complianceforge.ai</p>
                  <p className="text-indigo-400 text-xs">Password: demo123</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Work Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@complianceforge.ai"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      required
                    />
                  </div>

                  {error && (
                    <div className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Access Dashboard
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-800 text-center">
                  <p className="text-slate-500 text-sm">
                    EU AI Act enforcement:{' '}
                    <span className="text-red-400 font-semibold">August 2, 2026</span>
                  </p>
                  <p className="text-slate-600 text-xs mt-1">{daysLeft} days remaining</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
