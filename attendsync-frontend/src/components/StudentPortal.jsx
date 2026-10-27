import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';

export default function StudentPortal({ schoolId, token, handleLogout }) {
  const [data, setData] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State

  const [qrValue, setQrValue] = useState('');
  const [showOverallModal, setShowOverallModal] = useState(false);
  const [overallQrValue, setOverallQrValue] = useState('');
  
  const [gradingPeriod, setGradingPeriod] = useState('Prelim');

  const [scores, setScores] = useState({
    quiz: { 1: '', 2: '', 3: '', 4: '' },
    recitation: { 1: '', 2: '', 3: '', 4: '' },
    project: { 1: '', 2: '', 3: '', 4: '' }
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`https://attendsync-6dn6.onrender.com/api/student/dashboard/${schoolId}`);
        if (res.ok) {
          const result = await res.json();
          setData(result);
          if (result.subjects && result.subjects.length > 0) {
            setActiveSubject(result.subjects[0]);
          }
        } else {
          toast.error("Telemetry link failed.");
        }
      } catch (err) {
        toast.error("Network offline.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, [schoolId]);

  const activeColumns = gradingPeriod === 'Finals' ? [1, 2] : [1, 2, 3, 4];
  const totalPresent = activeSubject ? activeSubject.total_present : 0;
  const autoAttendance = {};
  
  let baseOffset = 0;
  if (gradingPeriod === 'Midterm') baseOffset = 4;
  if (gradingPeriod === 'Finals') baseOffset = 8;

  activeColumns.forEach(col => {
    autoAttendance[col] = totalPresent >= (baseOffset + col);
  });

  const handleScoreChange = (criteria, col, value) => {
    if (value === '') {
      setScores(prev => ({ ...prev, [criteria]: { ...prev[criteria], [col]: '' } }));
      return;
    }
    const num = Number(value);
    if (Number.isInteger(num) && num >= 1 && num <= 20) {
      setScores(prev => ({ ...prev, [criteria]: { ...prev[criteria], [col]: value } }));
    }
  };

  const handleGenerateDailyQR = () => {
    const qrPayload = {
      student_id: data?.student_number || schoolId,
      "Student Info": data?.name,
      "Section": activeSubject?.section_code,
      "Date & Time": new Date().toLocaleString(),
      "Daily Status": "Valid for Today"
    };
    setQrValue(JSON.stringify(qrPayload));
    toast.success("Daily Key Compiled!", { style: { background: '#022c22', color: '#34d399', border: '1px solid #059669' } });
  };

  const handleGenerateOverallQR = () => {
    const filteredScores = {};
    ['quiz', 'recitation', 'project'].forEach(criteria => {
      filteredScores[criteria] = {};
      activeColumns.forEach(col => {
        filteredScores[criteria][col] = scores[criteria][col];
      });
    });

    setOverallQrValue(JSON.stringify({
      student_id: data?.student_number || schoolId,
      "Student Info": data?.name,
      "Section": activeSubject?.section_code,
      grading_period: gradingPeriod,
      type: 'Overall Compilation',
      data: { scores: filteredScores, attendance: autoAttendance },
      timestamp: new Date().toISOString()
    }));
    toast.success("Vault Key Compiled!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030712] relative overflow-hidden">
        <style>{`.loader { border: 3px solid rgba(6,182,212,0.2); border-top: 3px solid #06b6d4; border-radius: 50%; width: 36px; height: 36px; animation: spin 1s linear infinite; box-shadow: 0 0 15px rgba(6,182,212,0.5); } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <div className="loader"></div>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen flex items-center justify-center bg-[#030712] text-cyan-400 font-mono tracking-widest text-xs">UPLINK FAILED. RELOAD.</div>;

  const subjectActivity = activeSubject ? data.recent_activity.filter(log => log.subject === activeSubject.name) : [];

  const QRIcon = () => (
    <svg className="w-16 h-16 text-cyan-400 mb-6 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-[#030712] text-slate-200 relative overflow-hidden selection:bg-cyan-500/30">
      
      {/* FUTURISTIC CSS GLOBALS */}
      <style>{`
        .bg-tech-grid { background-size: 40px 40px; background-image: linear-gradient(to right, rgba(6, 182, 212, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.05) 1px, transparent 1px); mask-image: radial-gradient(circle at center, black 40%, transparent 100%); }
        .orb-1 { position: absolute; top: -10%; left: -10%; width: 40vw; height: 40vw; background: radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%); border-radius: 50%; filter: blur(40px); z-index: 0; pointer-events: none; }
        .orb-2 { position: absolute; bottom: -10%; right: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%); border-radius: 50%; filter: blur(50px); z-index: 0; pointer-events: none; }
        .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(6, 182, 212, 0.2); box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(6, 182, 212, 0.05); }
        ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); } ::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.3); border-radius: 10px; } ::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.6); }
        @keyframes scanLine { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
        .qr-scanner-line { animation: scanLine 2s linear infinite; }
        input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      {/* Background Elements */}
      <div className="absolute inset-0 bg-tech-grid z-0"></div>
      <div className="orb-1"></div>
      <div className="orb-2"></div>

      {/* Desktop Sidebar - Hidden on Mobile */}
      <div className="hidden md:flex w-72 flex-col z-10 glass-panel border-y-0 border-l-0 border-r border-cyan-500/20 min-h-screen">
        <div className="p-6 border-b border-cyan-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold px-2 py-1 rounded text-[9px] tracking-[0.2em] shadow-[0_0_10px_rgba(6,182,212,0.3)]">ICCT</span>
            <span className="font-bold tracking-widest text-sm uppercase text-slate-100">AttendSync</span>
          </div>
          <div className="relative z-10">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-2.5 py-0.5 rounded uppercase tracking-[0.2em] mb-3 inline-block">Student</span>
            <p className="font-bold text-lg leading-tight mt-1 text-cyan-50">{data.name}</p>
            <p className="text-xs text-cyan-500/60 mt-1 font-mono tracking-wider">UID: {data.student_number}</p>
          </div>
        </div>

        <div className="flex-1 py-6 overflow-y-auto flex flex-col">
          <h3 className="text-[9px] font-bold text-cyan-500/70 uppercase tracking-[0.2em] mb-4 px-6">Assigned Protocols</h3>
          <div className="space-y-2 px-4 flex-1">
            {data.subjects.map((sub) => (
              <button
                key={sub.section_code}
                onClick={() => { setActiveSubject(sub); setQrValue(''); setOverallQrValue(''); }}
                className={`w-full py-3.5 px-4 text-left rounded-lg text-sm transition-all duration-300 relative overflow-hidden group ${activeSubject?.section_code === sub.section_code ? 'bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-slate-800/30 border border-transparent hover:border-cyan-500/30'}`}
              >
                {activeSubject?.section_code === sub.section_code && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"></div>}
                <p className={`font-bold text-sm tracking-wide ${activeSubject?.section_code === sub.section_code ? 'text-cyan-100' : 'text-slate-400 group-hover:text-cyan-200'}`}>{sub.name}</p>
              </button>
            ))}
            {data.subjects.length === 0 && (
              <p className="text-[10px] uppercase tracking-widest px-4 text-slate-500 text-center mt-6">Awaiting Assignments.</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-cyan-500/20 space-y-2">
          <button onClick={handleLogout} className="w-full py-3 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all text-left px-4 flex items-center font-bold tracking-widest uppercase border border-transparent hover:border-rose-500/30">
             <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> Logout
          </button>
        </div>
      </div>

      {/* Mobile Sticky Header */}
      <div className="md:hidden flex justify-between items-center p-4 border-b border-cyan-500/20 glass-panel z-50 sticky top-0">
        <div>
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-[0.2em] mb-1.5 inline-block">Student Node</span>
          <p className="font-bold text-base leading-tight text-cyan-50">{data.name}</p>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2.5 text-cyan-400 bg-slate-900 border border-cyan-500/30 rounded-lg focus:outline-none shadow-[0_0_10px_rgba(34,211,238,0.2)]">
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[75px] bg-[#030712]/95 backdrop-blur-xl border-b border-cyan-500/30 z-40 p-6 flex flex-col gap-6 shadow-[0_20px_40px_rgba(0,0,0,0.9)] overflow-y-auto pb-20 animate-in slide-in-from-top-2">
          <div>
            <h3 className="text-[9px] font-bold text-cyan-500/70 uppercase tracking-[0.2em] mb-4">Assigned Protocols</h3>
            <div className="flex flex-col gap-3">
              {data.subjects.map((sub) => (
                <button
                  key={sub.section_code}
                  onClick={() => { setActiveSubject(sub); setQrValue(''); setOverallQrValue(''); setIsMobileMenuOpen(false); }}
                  className={`w-full py-4 px-4 text-left rounded-xl text-sm transition-all duration-300 relative overflow-hidden ${activeSubject?.section_code === sub.section_code ? 'bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-slate-800/50 border border-slate-700'}`}
                >
                  {activeSubject?.section_code === sub.section_code && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"></div>}
                  <p className={`font-bold text-sm tracking-wide ${activeSubject?.section_code === sub.section_code ? 'text-cyan-100' : 'text-slate-300'}`}>{sub.name}</p>
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleLogout} className="w-full mt-auto py-4 text-xs text-rose-400 bg-rose-500/10 rounded-xl font-bold tracking-widest uppercase border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)] flex items-center justify-center">
            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> Disconnect
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 p-6 md:p-8 lg:p-12 z-10 w-full ${isMobileMenuOpen ? 'overflow-hidden max-h-[calc(100vh-75px)]' : 'overflow-y-auto'}`}>
        {activeSubject ? (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-cyan-500/20 pb-6 gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">{activeSubject.name}</h1>
                <p className="font-mono text-cyan-500/70 tracking-widest text-xs uppercase">Section: <span className="text-cyan-300 font-bold">{activeSubject.section_code}</span></p>
              </div>
            </div>

            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-cyan-500/70">Dashboard Overview</h2>
              <div className="flex flex-col md:flex-row items-center justify-between p-8 rounded-3xl glass-panel relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,1)] z-10"></div>
                <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <div className="relative z-10 mb-6 md:mb-0 text-center md:text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/80">Successful Attendance (Present)</p>
                  <p className="text-5xl font-mono font-black mt-2 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">{activeSubject.total_present}</p>
                </div>
                <div className="flex items-center gap-5 relative z-10 w-full md:w-auto justify-center">
                  <button onClick={() => setShowOverallModal(true)} className="px-6 py-3.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-400/50 font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] whitespace-nowrap w-full md:w-auto">Access Vault Key</button>
                  <div className="w-14 h-14 hidden md:flex rounded-full bg-emerald-500/10 items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.3)] shrink-0">
                    <svg className="w-7 h-7 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,1)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* QR GENERATOR CARD */}
              <div className="col-span-1 p-8 rounded-3xl glass-panel flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
                {!qrValue ? (
                  <div className="flex flex-col items-center w-full py-4 relative z-10">
                    <QRIcon />
                    <h3 className="text-lg font-black tracking-[0.15em] uppercase text-cyan-100 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">Daily QR</h3>
                    <p className="text-[9px] mt-2 text-cyan-500/70 font-mono tracking-widest uppercase mb-8">Ready to compile payload</p>
                    <button onClick={handleGenerateDailyQR} className="px-6 py-3.5 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-400/50 font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] w-full">Compile QR</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center w-full animate-in fade-in py-4 relative z-10">
                    <div className="p-4 bg-white/95 rounded-2xl mb-5 shadow-[0_0_30px_rgba(6,182,212,0.5)] relative overflow-hidden">
                      <div className="absolute left-0 right-0 h-1 bg-cyan-400/80 shadow-[0_0_10px_2px_rgba(34,211,238,0.8)] z-20 qr-scanner-line pointer-events-none"></div>
                      <QRCodeSVG value={qrValue} size={180} level={"L"} />
                    </div>
                    <h3 className="font-bold text-cyan-300 tracking-[0.15em] uppercase drop-shadow-[0_0_5px_rgba(103,232,249,0.8)]">Awaiting Scan</h3>
                    <button onClick={() => setQrValue('')} className="mt-6 text-[10px] font-bold text-cyan-500/80 hover:text-cyan-300 uppercase tracking-widest transition-colors">← Cancel Compile</button>
                  </div>
                )}
              </div>

              {/* HISTORY TABLE */}
              <div className="col-span-2 rounded-3xl glass-panel flex flex-col overflow-hidden">
                <div className="px-8 py-6 border-b border-cyan-500/20 bg-slate-900/30">
                  <h3 className="font-bold text-sm uppercase tracking-[0.15em] text-cyan-100">Attendance History</h3>
                </div>
                <div className="overflow-x-auto flex-1 p-2">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="px-6 py-4 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em]">Timestamp</th>
                        <th className="px-6 py-4 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em]">Clock</th>
                        <th className="px-6 py-4 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em] text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {subjectActivity.length === 0 ? (
                        <tr><td colSpan="3" className="px-8 py-12 text-center text-[11px] font-mono uppercase tracking-widest text-slate-500">No uplink data logged.</td></tr>
                      ) : (
                        subjectActivity.map(record => (
                          <tr key={record.id} className="hover:bg-cyan-500/5 transition-colors">
                            <td className="px-6 py-4 font-bold text-cyan-100 tracking-wider text-[13px]">{record.date}</td>
                            <td className="px-6 py-4 text-[11px] font-mono text-slate-400">{record.time}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-[0.2em] uppercase border ${record.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-cyan-500/50 animate-pulse min-h-[50vh]">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            <p className="font-mono text-xs uppercase tracking-[0.2em]">Awaiting Subject Matrix</p>
          </div>
        )}
      </div>

      {/* OVERALL QR MODAL (Holographic HUD) */}
      {showOverallModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-xl rounded-2xl overflow-hidden flex flex-col border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            <div className="p-5 border-b border-indigo-500/20 flex justify-between items-center bg-indigo-950/30">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold tracking-widest uppercase text-indigo-300 hidden md:block">Vault Compiler</h2>
                <h2 className="text-md font-bold tracking-widest uppercase text-indigo-300 md:hidden">Compiler</h2>
                <select 
                  value={gradingPeriod} 
                  onChange={(e) => { setGradingPeriod(e.target.value); setOverallQrValue(''); }}
                  className="px-3 py-1.5 text-[10px] font-mono rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 focus:border-indigo-400 outline-none transition-all uppercase tracking-widest [&>option]:bg-slate-900"
                >
                  <option value="Prelim">Prelim (4)</option>
                  <option value="Midterm">Midterm (4)</option>
                  <option value="Finals">Finals (2)</option>
                </select>
              </div>
              <button onClick={() => { setShowOverallModal(false); setOverallQrValue(''); }} className="p-2 font-bold text-rose-500 hover:text-rose-400 hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] transition-all text-xs tracking-widest uppercase">Cancel</button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto max-h-[80vh] custom-scrollbar">
              <div className="mb-6 overflow-x-auto">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="border-b-2 border-indigo-500/30 text-indigo-400 uppercase tracking-widest text-[10px]">
                      <th className="p-2 font-bold text-left">Vector</th>
                      {activeColumns.map(col => (
                        <th key={col} className="p-2 font-bold w-12 md:w-16">N-{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-indigo-500/10">
                    {['quiz', 'recitation', 'project'].map((criteria) => (
                      <tr key={criteria}>
                        <td className="p-3 font-medium text-left uppercase tracking-wider text-indigo-200 text-[10px] md:text-[11px]">{criteria}</td>
                        {activeColumns.map((col) => (
                          <td key={col}>
                            <input 
                              type="number" 
                              min="1" max="20" 
                              value={scores[criteria][col]} 
                              onChange={(e) => handleScoreChange(criteria, col, e.target.value)} 
                              className="w-10 md:w-12 h-9 text-center font-mono font-bold rounded-lg bg-slate-900/60 border border-indigo-500/30 text-indigo-100 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all" 
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-indigo-500/10">
                      <td className="p-3 text-left font-bold uppercase tracking-wider text-cyan-400 text-[10px] md:text-[11px]">Attendance</td>
                      {activeColumns.map((col) => (
                        <td key={col}>
                          <div className={`w-3 h-3 mx-auto rounded-full ${autoAttendance[col] ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-slate-700/50 border border-slate-600'}`}></div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {!overallQrValue ? (
                <button onClick={handleGenerateOverallQR} className="w-full py-4 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-400/50 font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]">Generate Vault Payload</button>
              ) : (
                <div className="flex flex-col items-center w-full animate-in fade-in py-5 mt-2 border-t border-dashed border-indigo-500/30">
                  <div className="p-4 bg-white/95 rounded-2xl mb-4 shadow-[0_0_30px_rgba(99,102,241,0.5)] relative overflow-hidden">
                     <div className="absolute left-0 right-0 h-1 bg-indigo-500/80 shadow-[0_0_10px_2px_rgba(99,102,241,0.8)] z-20 qr-scanner-line pointer-events-none"></div>
                     <QRCodeSVG value={overallQrValue} size={180} level={"L"} />
                  </div>
                  <h3 className="font-bold text-indigo-300 tracking-[0.15em] uppercase drop-shadow-[0_0_5px_rgba(165,180,252,0.8)]">Ready for Transmission</h3>
                  <p className="text-[9px] uppercase tracking-[0.2em] mt-2 text-indigo-500/70 font-mono">Present Payload to Commander</p>
                  <button onClick={() => setOverallQrValue('')} className="mt-6 text-[9px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors">← Cancel Compile</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}