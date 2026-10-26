// src/components/LoginGateway.jsx
import React from 'react';

export default function LoginGateway({ 
  role, 
  setRole, 
  schoolId, 
  setSchoolId, 
  password, 
  setPassword, 
  error, 
  handleLogin,
  onRegisterClick 
}) {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 font-sans text-slate-200 relative overflow-hidden selection:bg-cyan-500/30">
      
      <style>{`
        .bg-tech-grid { background-size: 40px 40px; background-image: linear-gradient(to right, rgba(6, 182, 212, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.05) 1px, transparent 1px); mask-image: radial-gradient(circle at center, black 40%, transparent 100%); }
        .orb-1 { position: absolute; top: -10%; left: -10%; width: 40vw; height: 40vw; background: radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%); border-radius: 50%; filter: blur(40px); z-index: 0; pointer-events: none; }
        .orb-2 { position: absolute; bottom: -10%; right: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%); border-radius: 50%; filter: blur(50px); z-index: 0; pointer-events: none; }
        .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(6, 182, 212, 0.2); box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(6, 182, 212, 0.05); }
      `}</style>

      <div className="absolute inset-0 bg-tech-grid z-0"></div>
      <div className="orb-1"></div>
      <div className="orb-2"></div>

      {/* Added 'group' class here to trigger the morph on hover */}
      <div className="glass-panel rounded-3xl flex flex-col md:flex-row w-full max-w-5xl min-h-[550px] overflow-hidden relative z-10 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] group">
        
        {/* Left Side (AttendSync Panel) */}
        <div className="w-full md:w-full md:group-hover:w-1/2 p-10 flex flex-col justify-between relative bg-slate-900/40 border-b md:border-b-0 md:border-r border-transparent md:group-hover:border-cyan-500/20 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] z-20">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold px-2 py-1.5 rounded text-[10px] tracking-[0.2em] shadow-[0_0_10px_rgba(6,182,212,0.3)]">
              ICCT
            </div>
            <div className="text-[10px] leading-tight text-cyan-500/70 font-mono">
              <span className="font-bold tracking-widest text-cyan-100 uppercase">Colleges</span><br />
            </div>
          </div>
          
          {/* Main Logo Text - Scales slightly down on hover */}
          <div className="text-center mt-20 mb-20 relative z-10 md:scale-110 md:group-hover:scale-100 transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]">
            <h1 className="text-5xl font-black tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              ATTEND<span className="text-cyan-200">SYNC</span>
            </h1>
            <p className="text-[10px] tracking-[0.3em] font-bold text-cyan-500/80 uppercase">
              Attendance System
            </p>
            
            {/* Visual Hint for Desktop Users - Fades out on hover */}
            <p className="absolute left-1/2 -translate-x-1/2 -bottom-16 text-[9px] font-mono tracking-widest text-cyan-400 animate-pulse md:opacity-100 md:group-hover:opacity-0 transition-opacity duration-300 hidden md:block">
              » Welcome «
            </p>
          </div>

          <div className="flex justify-between items-end relative z-10 opacity-50">
            <div className="w-12 h-1 bg-cyan-500/30 rounded-full"></div>
            <div className="flex gap-1">
               <div className="w-2 h-2 bg-cyan-400 rounded-sm animate-pulse"></div>
               <div className="w-2 h-2 bg-cyan-500/30 rounded-sm"></div>
               <div className="w-2 h-2 bg-cyan-500/30 rounded-sm"></div>
            </div>
          </div>
        </div>

        {/* Right Side (Login Form Panel) */}
        {/* Initially w-0 and opacity-0 on desktop, morphs to w-1/2 and opacity-100 on hover */}
        <div className="w-full md:w-0 opacity-100 md:opacity-0 md:group-hover:w-1/2 md:group-hover:opacity-100 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col justify-center items-center relative bg-black/20 overflow-hidden z-10">
          
          {/* Inner wrapper with fixed width prevents the form from squishing during the slide transition */}
          <div className="w-full md:w-[480px] p-10 flex flex-col justify-center items-center relative z-10 md:translate-x-12 md:group-hover:translate-x-0 transition-transform duration-700 delay-75 ease-[cubic-bezier(0.4,0,0.2,1)]">
            <div className="w-full max-w-sm">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-black text-cyan-100 mb-2 tracking-[0.15em] uppercase drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">Login to Your Account</h2>
                <p className="text-[10px] text-cyan-500/60 font-mono tracking-widest uppercase">Enter your credentials to access the system</p>
              </div>

              <div className="flex w-full mb-8 rounded-xl overflow-hidden bg-slate-900/60 border border-cyan-500/30 p-1.5 shadow-inner">
                <button 
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded-lg bg-transparent transition-all duration-300 ${role === 'student' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-slate-500 hover:text-cyan-400/70 border border-transparent'}`}
                >
                  Student Login
                </button>
                <button 
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] rounded-lg bg-transparent transition-all duration-300 ${role === 'teacher' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-slate-500 hover:text-cyan-400/70 border border-transparent'}`}
                >
                  Teacher Login
                </button>
              </div>

              {error && (
                <div className="bg-rose-500/10 text-rose-400 font-mono text-[10px] uppercase tracking-widest text-center py-3 mb-6 rounded-lg border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <input
                    type="text"
                    placeholder="username"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-900/60 border border-cyan-500/30 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-cyan-50 placeholder-slate-600 font-mono text-xs transition-all duration-300 hover:bg-slate-900/80"
                    required
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-900/60 border border-cyan-500/30 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-cyan-50 placeholder-slate-600 font-mono text-xs transition-all duration-300 hover:bg-slate-900/80"
                    required
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full mt-4 py-4 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-400/50 font-bold text-[11px] uppercase tracking-[0.2em] rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)]"
                >
                  Login
                </button>

                {role === 'student' && (
                  <p className="text-center text-[10px] text-slate-500 font-mono uppercase tracking-[0.1em] mt-8">
                    Not Yet Registered?{' '}
                    <button 
                      type="button" 
                      onClick={onRegisterClick} 
                      className="text-cyan-400 font-bold hover:text-cyan-300 hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] transition-all duration-300 ml-1"
                    >
                      Register Student
                    </button>
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}