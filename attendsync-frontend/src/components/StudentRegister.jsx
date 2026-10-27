// src/components/StudentRegister.jsx
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function StudentRegister({ onBackToLogin }) {
  const [formData, setFormData] = useState({
    student_number: '',
    password: '',
    confirm_password: '',
    email: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    birthdate: '',
    gender: 'Male',
    program: 'BSIT'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirm_password) {
      const msg = "Passwords do not match.";
      setError(msg);
      toast.error(msg, { style: { background: '#450a0a', color: '#f87171', border: '1px solid #991b1b' } });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`https://attendsync-6dn6.onrender.com/api/students/request-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setShowVerifyModal(true);
        toast.success(`Verification code dispatched to ${formData.email}`, {
          style: { background: '#022c22', color: '#34d399', border: '1px solid #059669' }
        });
      } else {
        const errData = await res.json();
        setError(errData.detail);
        toast.error(errData.detail || "Registration request failed.");
      }
    } catch (err) {
      const msg = "Network uplink offline.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`https://attendsync-6dn6.onrender.com/api/students/verify-and-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode,
          student_data: formData
        })
      });
      
      if (res.ok) {
        toast.success("Entity node registered! Please initiate login.", {
          style: { background: '#022c22', color: '#34d399', border: '1px solid #059669' }
        });
        setShowVerifyModal(false);
        onBackToLogin(); 
      } else {
        const errData = await res.json();
        setError(errData.detail);
        toast.error(errData.detail || "Verification failed.");
      }
    } catch (err) {
      const msg = "Verification process failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-4 font-sans text-slate-200 relative overflow-hidden selection:bg-cyan-500/30">
      
      <style>{`
        .bg-tech-grid { background-size: 40px 40px; background-image: linear-gradient(to right, rgba(6, 182, 212, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.05) 1px, transparent 1px); mask-image: radial-gradient(circle at center, black 40%, transparent 100%); }
        .orb-1 { position: absolute; top: -10%; left: -10%; width: 40vw; height: 40vw; background: radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%); border-radius: 50%; filter: blur(40px); z-index: 0; pointer-events: none; }
        .orb-2 { position: absolute; bottom: -10%; right: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%); border-radius: 50%; filter: blur(50px); z-index: 0; pointer-events: none; }
        .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(6, 182, 212, 0.2); box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(6, 182, 212, 0.05); }
        ::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); border-radius: 4px; } ::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.3); border-radius: 4px; } ::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.6); }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.8; filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg); }
      `}</style>

      <div className="absolute inset-0 bg-tech-grid z-0"></div>
      <div className="orb-1"></div>
      <div className="orb-2"></div>

      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-sm p-8 rounded-2xl border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.3)] text-center animate-in zoom-in-95 relative">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none"></div>
            
            <h2 className="text-xl font-black text-cyan-100 uppercase tracking-[0.15em] mb-2 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">Authorize Security Code</h2>
            <p className="text-[10px] text-cyan-500/70 font-mono tracking-widest uppercase mb-6">
              Dispatched 6-digit key to <br/>
              <span className="font-bold text-cyan-300 font-mono">{formData.email}</span>
            </p>
            
            <input 
              type="text" 
              maxLength="6"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full text-center tracking-[0.4em] text-3xl font-mono font-black px-4 py-3 rounded-xl bg-slate-900/80 border border-cyan-500/40 text-cyan-300 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none mb-6 shadow-inner transition-all duration-300"
            />
            
            {error && <p className="text-[10px] font-mono uppercase tracking-widest text-rose-400 mb-4">{error}</p>}
            
            <button 
              onClick={handleVerifyCode}
              disabled={isLoading || verificationCode.length < 6}
              className="w-full py-3.5 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-400/50 font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] disabled:opacity-40 cursor-pointer"
            >
              {isLoading ? 'Verifying Code...' : 'Authorize Node Creation'}
            </button>
            <button onClick={() => setShowVerifyModal(false)} className="mt-4 text-[10px] font-bold text-slate-500 hover:text-cyan-400 font-mono tracking-widest uppercase transition-colors duration-300">Abort Authorization</button>
          </div>
        </div>
      )}

      <div className="glass-panel w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row h-[620px] relative z-10 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
        
        <div className="w-full md:w-[40%] bg-slate-900/40 p-8 flex flex-col justify-between text-slate-200 hidden md:flex border-r border-cyan-500/20 relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3 relative z-10">
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold px-2 py-1 rounded text-[10px] tracking-[0.2em] shadow-[0_0_10px_rgba(6,182,212,0.3)]">ICCT</span>
            <div className="leading-tight text-[10px] font-mono text-cyan-500/70">
              <p className="font-bold tracking-widest text-cyan-100 uppercase">Colleges</p>
            </div>
          </div>
          
          <div className="relative z-10">
            <h1 className="text-4xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              ATTEND<span className="text-cyan-200">SYNC</span>
            </h1>
            <p className="text-[10px] tracking-[0.25em] text-cyan-500/80 uppercase font-bold">Attendance System</p>
          </div>
          
          <div className="flex justify-between items-end relative z-10 opacity-50">
            <div className="w-12 h-1 bg-cyan-500/30 rounded-full"></div>
            <div className="flex gap-1">
               <div className="w-2 h-2 bg-cyan-400 rounded-sm animate-pulse"></div>
               <div className="w-2 h-2 bg-cyan-500/30 rounded-sm"></div>
            </div>
          </div> 
        </div>

        <div className="w-full md:w-[60%] p-8 md:p-10 overflow-y-auto relative bg-black/20 custom-scrollbar">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-cyan-100 uppercase tracking-[0.15em] drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">Register Student</h2>
            <p className="text-[10px] text-cyan-500/60 font-mono tracking-widest uppercase mt-1">Create your attendance account</p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            
            {error && !showVerifyModal && (
              <div className="bg-rose-500/10 text-rose-400 text-[10px] font-mono uppercase tracking-widest p-3 rounded-xl border border-rose-500/30 text-center shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                {error}
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-4 border-b border-cyan-500/20 pb-2">Credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="student_number" placeholder="Student Number" required value={formData.student_number} onChange={handleChange} 
                  className="w-full px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-50 placeholder-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all duration-300 hover:bg-slate-900/80" />
                <input type="email" name="email" placeholder="Email" required value={formData.email} onChange={handleChange} 
                  className="w-full px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-50 placeholder-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all duration-300 hover:bg-slate-900/80" />
                <input type="password" name="password" placeholder="Password" required value={formData.password} onChange={handleChange} 
                  className="w-full px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-50 placeholder-slate-600 focus:border-cyan-40  focus:ring-1 focus:ring-cyan-400 outline-none transition-all duration-3₀₀ hover:bg-slate-9₀₀/8₀" />
                <input type="password" name="confirm_password" placeholder="Confirm Password" required value={formData.confirm_password} onChange={handleChange} 
                  className="w-full px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-50 placeholder-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all duration-300 hover:bg-slate-900/80" />
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-4 border-b border-cyan-500/20 pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input type="text" name="first_name" placeholder="First Name" required value={formData.first_name} onChange={handleChange} 
                  className="w-full px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-50 placeholder-slate-600 focus:border-cyan-400 outline-none transition-all duration-300 hover:bg-slate-900/80" />
                <input type="text" name="middle_name" placeholder="Middle Name (Opt)" value={formData.middle_name} onChange={handleChange} 
                  className="w-full px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-50 placeholder-slate-600 focus:border-cyan-400 outline-none transition-all duration-300 hover:bg-slate-900/80" />
                <input type="text" name="last_name" placeholder="Last Name" required value={formData.last_name} onChange={handleChange} 
                  className="w-full px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-50 placeholder-slate-600 focus:border-cyan-400 outline-none transition-all duration-300 hover:bg-slate-900/80" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="date" name="birthdate" required value={formData.birthdate} onChange={handleChange} 
                  className="w-full px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-400 focus:border-cyan-400 outline-none transition-all duration-300 cursor-pointer hover:bg-slate-900/80" />
                <select name="gender" value={formData.gender} onChange={handleChange} 
                  className="w-full px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-50 focus:border-cyan-400 outline-none transition-all duration-300 hover:bg-slate-900/80 [&>option]:bg-slate-900">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <select name="program" value={formData.program} onChange={handleChange} 
                  className="w-full px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-50 focus:border-cyan-400 outline-none transition-all duration-300 hover:bg-slate-900/80 [&>option]:bg-slate-900">
                  <option value="BSIT">BSIT</option>
                  <option value="BSCS">BSCS</option>
                  <option value="ACT">ACT</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full py-4 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-400/50 font-bold text-[11px] uppercase tracking-[0.2em] rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] mt-4">
              {isLoading ? 'Processing Request...' : 'Create Student Account'}
            </button>

            <p className="text-center text-[10px] text-slate-500 font-mono uppercase tracking-[0.1em] mt-6">
              Existing Node Registered? <button type="button" onClick={onBackToLogin} className="text-cyan-400 font-bold hover:text-cyan-300 hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] transition-all duration-300 ml-1">Login Here</button>
            </p>
          </form>

        </div>
      </div>
    </div>
  );
}