import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { Mic, Shield, List, ChevronRight, Upload, X, Square, LayoutDashboard, Settings, Activity, User as UserIcon, Moon, Sun, Database, Sparkles, LogOut, Lock, Eye, EyeOff, UserCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import { useRecorder, RecorderStatus } from './hooks/useRecorder'
import { Waveform } from './components/Waveform'
import { RecordingService } from './services/recordingService'
import { AdminDashboard } from './components/AdminDashboard'
import { SettingsView } from './components/SettingsView'
import { SequenceUtils } from './utils/sequenceUtils'

const formatTime = (s: number) => {
  const mins = Math.floor(s / 60)
  const secs = s % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface RecorderViewProps {
  status: RecorderStatus
  startRecording: () => void
  stopRecording: () => void
  audioUrl: string | null
  audioBlob: Blob | null
  duration: number
  clearRecording: () => void
  setStatus: (status: RecorderStatus) => void
  analyser: AnalyserNode | null
  speakerId: string
  setSpeakerId: (id: string) => void
  predictedId: string
  isRefreshing: boolean
  isUploading: boolean
  handleUpload: () => void
}

const RecorderView = ({ 
  status, startRecording, stopRecording, audioUrl, duration, clearRecording, analyser, 
  speakerId, setSpeakerId, predictedId, isRefreshing, isUploading, handleUpload 
}: RecorderViewProps) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
    <div className="md:col-span-4 flex flex-col gap-6">
      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6"><h3 className="text-sm font-archivo font-bold text-slate-400 uppercase tracking-widest">Pattern AI</h3><Sparkles className="w-4 h-4 text-primary-light animate-pulse" /></div>
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-slate-400 mb-2 block uppercase tracking-widest">Set Starting Point</label>
            <input type="text" value={speakerId} onChange={(e) => setSpeakerId(e.target.value)} disabled={status !== 'idle'} className="w-full bg-transparent border-b border-[var(--border-color)] py-2 text-2xl font-bold focus:outline-none focus:border-primary-light" />
          </div>
          <div className="pt-4 border-t border-[var(--border-color)]">
            <label className="text-[10px] font-bold text-slate-500 mb-2 block uppercase tracking-widest">Next Smart ID</label>
            <div className="flex items-center justify-between py-2"><span className={`text-2xl font-mono font-bold ${isRefreshing ? 'opacity-30' : 'text-primary-light'}`}>{predictedId}</span></div>
          </div>
        </div>
      </div>
    </div>

    <div className="md:col-span-8 flex flex-col gap-6">
      <div className="flex-1 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-8 md:p-12 flex flex-col items-center justify-center gap-8 shadow-sm">
        {status !== 'idle' && (
          <Waveform url={audioUrl} isRecording={status === 'recording'} analyser={analyser} />
        )}
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="text-6xl font-mono font-light tracking-tighter text-slate-800 dark:text-slate-100">{formatTime(duration)}</div>
          <div className="flex items-center gap-12">
            <AnimatePresence mode="wait">
              {status === 'idle' || status === 'recording' ? (
                <button onClick={status === 'recording' ? stopRecording : startRecording} className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${status === 'recording' ? 'bg-red-500 text-white ring-4 ring-red-500/20' : 'bg-primary-light text-white hover:scale-105'}`}>
                  {status === 'recording' ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-10 h-10" />}
                </button>
              ) : (
                <div className="flex gap-6">
                  <button onClick={clearRecording} className="w-16 h-16 bg-slate-100 dark:bg-slate-900 border border-[var(--border-color)] rounded-full flex items-center justify-center text-slate-500 hover:text-red-500"><X className="w-6 h-6" /></button>
                  <button onClick={handleUpload} disabled={isUploading || status === 'success'} className={`h-16 px-12 rounded-full flex items-center gap-3 font-bold text-lg shadow-md ${status === 'success' ? 'bg-green-500 text-white' : 'bg-primary-light text-white'}`}>
                    {isUploading ? '...' : status === 'success' ? 'SAVED' : <><Upload className="w-5 h-5" /> UPLOAD</>}
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
)

function App() {
  const [session, setSession] = useState<any>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const location = useLocation()
  
  // Persistent Theme Logic
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })

  // User Profile Logic
  const [userName, setUserName] = useState(() => localStorage.getItem('recorder_user_name') || '')
  const [tempName, setTempName] = useState('')

  const [speakerId, setSpeakerId] = useState('001')
  const [predictedId, setPredictedId] = useState('001')
  const [isUploading, setIsUploading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authForm, setAuthForm] = useState({ email: '', password: '', isLogin: true })
  const [showPassword, setShowPassword] = useState(false)

  const { 
    status, startRecording, stopRecording, audioUrl, audioBlob, duration, clearRecording, setStatus, analyser
  } = useRecorder()

  // Handle Session & Theme Persistence
  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
      } finally {
        setIsSessionLoading(false)
      }
    }

    bootstrapSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setIsSessionLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const syncSequence = async () => {
    if (!session) return
    setIsRefreshing(true)
    try {
      const nextId = await RecordingService.getNextSmartId(speakerId)
      setPredictedId(nextId)
    } catch (err: any) {
      console.warn('Could not sync sequence:', err?.message || err)
      setPredictedId(`${speakerId}_${Date.now().toString().slice(-4)}`)
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => syncSequence(), 500)
    return () => clearTimeout(timer)
  }, [speakerId, session])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { error } = authForm.isLogin 
        ? await supabase.auth.signInWithPassword({ email: authForm.email, password: authForm.password })
        : await supabase.auth.signUp({ email: authForm.email, password: authForm.password })
      
      if (error) {
        alert(error.message)
      }
    } catch (err: any) {
      alert("Connection error.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
    } catch (error: any) {
      alert(error.message || 'Failed to sign in with Google')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tempName.trim()) {
      setUserName(tempName)
      localStorage.setItem('recorder_user_name', tempName)
    }
  }

  const handleUpload = async () => {
    if (!audioBlob) return
    if (!session?.user?.id) return
    
    setIsUploading(true)
    try {
      let usedId = await RecordingService.getNextSmartId(speakerId)
      let saveCompleted = false

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const candidateId = attempt === 0 ? usedId : await RecordingService.getNextSmartId(speakerId)
        usedId = candidateId

        const filePath = await RecordingService.uploadAudio(audioBlob, candidateId)
        
        try {
          await RecordingService.saveMetadata({
            speaker_id: speakerId,
            display_id: candidateId,
            file_path: filePath,
            duration: duration,
            user_id: session.user.id,
            user_name: userName
          })
          saveCompleted = true
          break
        } catch (metadataErr: any) {
          if (metadataErr.message?.includes('duplicate') && attempt === 0) continue
          throw metadataErr
        }
      }

      if (saveCompleted) {
        setStatus('success')
        const nextOne = SequenceUtils.getNextValue(usedId)
        setPredictedId(nextOne)
        setTimeout(() => clearRecording(), 2000)
      }
    } catch (err: any) {
      alert(`❌ Error: ${err?.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  if (isSessionLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="w-14 h-14 border-4 border-primary-light/30 border-t-primary-light rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 md:p-6 mesh-bg transition-colors duration-500`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          className="w-full max-w-md liquid-glass p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group"
        >
          {/* Subtle Decorative Glows */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary-premium/10 rounded-full blur-3xl group-hover:bg-primary-premium/20 transition-colors duration-700" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors duration-700" />

          <div className="flex flex-col items-center mb-6 relative z-10 text-center">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-amber-500/20 relative"
            >
              <Lock className="w-10 h-10 text-white" />
              <div className="absolute inset-0 bg-white/20 rounded-[2rem] blur-xl animate-pulse" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-archivo font-bold tracking-tight text-center w-full">Recorder Access</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 font-medium max-w-[280px] mx-auto text-center">
              {authForm.isLogin ? 'Welcome back! Secure access to your recordings.' : 'Create a premium account to start recording.'}
            </p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4 relative z-10">
            <div>
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-2 ml-1">Identity (Email)</label>
              <input 
                type="email" 
                value={authForm.email} 
                onChange={e => setAuthForm({...authForm, email: e.target.value})} 
                className="w-full bg-white/50 dark:bg-slate-900/50 border border-[var(--border-color)] rounded-2xl px-5 py-4 outline-none focus:border-primary-premium focus:ring-4 focus:ring-primary-premium/10 transition-all text-base font-medium" 
                placeholder="name@company.com"
                required 
              />
            </div>
            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-2 ml-1">Security Key</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={authForm.password} 
                  onChange={e => setAuthForm({...authForm, password: e.target.value})} 
                  className="w-full bg-white/50 dark:bg-slate-900/50 border border-[var(--border-color)] rounded-2xl px-5 py-4 pr-14 outline-none focus:border-primary-premium focus:ring-4 focus:ring-primary-premium/10 transition-all text-base font-medium" 
                  placeholder="••••••••"
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-primary-premium transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full premium-gradient text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : (authForm.isLogin ? 'Initialize Session' : 'Create Identity')}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--border-color)] opacity-50"></div></div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]"><span className="bg-transparent px-4 text-slate-400">Gateway</span></div>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleAuth} 
              disabled={isLoading} 
              className="w-full bg-white dark:bg-slate-900 border border-[var(--border-color)] text-[var(--text-color)] py-4 rounded-2xl font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"/></svg>
              Sign in with Google
            </button>
          </form>
          
          <div className="mt-6 text-center relative z-10">
            <button 
              onClick={() => setAuthForm({...authForm, isLogin: !authForm.isLogin})} 
              className="text-[10px] font-black text-primary-premium hover:text-amber-600 transition-colors uppercase tracking-widest border-b border-primary-premium/30 pb-1"
            >
              {authForm.isLogin ? "Request New Access" : "Already registered? Authenticate"}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!userName) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-color)] p-10 rounded-[2.5rem] shadow-xl text-center">
          <div className="w-20 h-20 bg-primary-light/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserCircle className="w-10 h-10 text-primary-light" />
          </div>
          <h2 className="text-3xl font-archivo font-bold mb-2">Identify Yourself</h2>
          <p className="text-slate-500 text-sm mb-8">Please enter your name to start recording.</p>
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <input type="text" value={tempName} onChange={e => setTempName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 border border-[var(--border-color)] rounded-xl px-4 py-3 outline-none focus:border-primary-light text-lg font-medium" placeholder="Your Full Name" required />
            <button type="submit" className="w-full bg-primary-light text-white py-4 rounded-xl font-bold">Start Recording</button>
          </form>
        </motion.div>
      </div>
    )
  }


  const navItemClass = ({ isActive }: { isActive: boolean }) => 
    `flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 text-[10px] md:text-sm font-bold rounded-xl transition-all duration-300 ${
      isActive 
        ? 'bg-primary-light/10 text-primary-light shadow-sm' 
        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col font-space transition-colors pb-20 md:pb-0">
      {/* Desktop Header */}
      <nav className="h-20 border-b border-[var(--border-color)] px-4 md:px-8 flex items-center justify-between sticky top-0 bg-[var(--bg-color)]/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-4 md:gap-10">
          <NavLink to="/" className="flex items-center gap-2">
            <Mic className="w-6 h-6 md:w-7 md:h-7 text-primary-light" />
            <span className="font-archivo font-black text-base md:text-xl tracking-tighter uppercase">recorder</span>
          </NavLink>
          <div className="hidden md:flex items-center gap-2">
            <NavLink to="/" className={navItemClass}>Session</NavLink>
            {session?.user?.email === 'ronakhos6666@gmail.com' && (
              <NavLink to="/admin" className={navItemClass}>Analytics</NavLink>
            )}
            <NavLink to="/settings" className={navItemClass}>Settings</NavLink>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-5">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Operator</span>
            <span className="text-sm font-bold text-primary-light">{userName}</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 md:p-3 rounded-2xl border border-[var(--border-color)] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">{darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
          <button onClick={() => supabase.auth.signOut()} className="p-2 md:p-3 rounded-2xl border border-[var(--border-color)] hover:bg-red-500 hover:text-white transition-colors shadow-sm"><LogOut className="w-4 h-4" /></button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[var(--bg-color)]/90 backdrop-blur-2xl border-t border-[var(--border-color)] flex items-center justify-around px-6 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <NavLink to="/" className={navItemClass}>
          <Mic className="w-6 h-6" />
          <span>Session</span>
        </NavLink>
        {session?.user?.email === 'ronakhos6666@gmail.com' && (
          <NavLink to="/admin" className={navItemClass}>
            <LayoutDashboard className="w-6 h-6" />
            <span>Analytics</span>
          </NavLink>
        )}
        <NavLink to="/settings" className={navItemClass}>
          <Settings className="w-6 h-6" />
          <span>Settings</span>
        </NavLink>
      </nav>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <Routes>
          <Route path="/" element={
            <RecorderView 
              status={status}
              startRecording={startRecording}
              stopRecording={stopRecording}
              audioUrl={audioUrl}
              audioBlob={audioBlob}
              duration={duration}
              clearRecording={clearRecording}
              setStatus={setStatus}
              analyser={analyser}
              speakerId={speakerId}
              setSpeakerId={setSpeakerId}
              predictedId={predictedId}
              isRefreshing={isRefreshing}
              isUploading={isUploading}
              handleUpload={handleUpload}
            />
          } />
          <Route path="/admin" element={
            session?.user?.email === 'ronakhos6666@gmail.com' 
              ? <AdminDashboard /> 
              : <Navigate to="/" replace />
          } />
          <Route path="/settings" element={<SettingsView onNameChange={setUserName} currentName={userName} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
