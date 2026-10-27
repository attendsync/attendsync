import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { toast } from 'react-hot-toast';

const getTodayRaw = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const ALLOWED_SECTIONS = ['LFAU411A031', 'LFAU411A032', 'LFAU411A033', 'LFAU411A034'];

export default function TeacherPortal({ schoolId, teacherName, token, handleLogout }) {
  const teacherId = schoolId || 'TCH-2026';
  const displayName = teacherName || schoolId || 'Dela Cruz';
  
  const [activeSection, setActiveSection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('management'); 
  const [recordTab, setRecordTab] = useState('daily');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting...'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const html5QrCodeRef = useRef(null);

  const [classes, setClasses] = useState([]);
  const [roster, setRoster] = useState([]);
  const [scannedLogs, setScannedLogs] = useState([]);
  const [overallGrades, setOverallGrades] = useState([]);

  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedGradeRecord, setSelectedGradeRecord] = useState(null);
  const [newClassForm, setNewClassForm] = useState({ name: '', section_code: ALLOWED_SECTIONS[0] });
  const [newStudent, setNewStudent] = useState({ student_number: '', program: 'BSIT', section_code: '', name: '', email: '' });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState(getTodayRaw());
  
  const currentSectionCode = activeSection;
  const activeSubjectName = classes.find(c => c.section === activeSection)?.name || 'Loading...';

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await fetch(`https://attendsync-6dn6.onrender.com/api/classes/${teacherId}`);
        const data = await res.json();
        setClasses(data);
        if (data.length > 0) {
          setActiveSection(data[0].section);
          setNewStudent(prev => ({ ...prev, section_code: data[0].section }));
        }
      } catch (err) {
        toast.error("Failed to load handled classes.", { style: { background: '#0f172a', color: '#38bdf8', border: '1px solid #0369a1' } });
      } finally {
        setIsLoading(false);
      }
    };
    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    if (!currentSectionCode) return;
    const fetchRosterAndLogs = async () => {
      setIsLoading(true);
      try {
        const rosterRes = await fetch(`https://attendsync-6dn6.onrender.com/api/roster/${currentSectionCode}`);
        const rosterData = await rosterRes.json();
        setRoster(rosterData);

        const logsRes = await fetch(`https://attendsync-6dn6.onrender.com/api/attendance/${currentSectionCode}?date_filter=${dateFilter}`);
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setScannedLogs(logsData);
        } else {
          setScannedLogs([]);
        }
      } catch (err) { 
        console.error(err); 
      } finally { 
        setTimeout(() => setIsLoading(false), 300); 
      }
    };
    fetchRosterAndLogs();
  }, [currentSectionCode, dateFilter]);

  useEffect(() => {
    if (activeTab === 'attendance' && recordTab === 'overall' && currentSectionCode) {
      fetch(`https://attendsync-6dn6.onrender.com/api/grades/${currentSectionCode}`)
        .then(res => res.json())
        .then(data => setOverallGrades(data))
        .catch(() => toast.error("Failed to load overall gradebook storage."));
    }
  }, [activeTab, recordTab, currentSectionCode]);

  useEffect(() => {
    if (!currentSectionCode) return;
    setWsStatus('Connecting to Matrix...');
    const ws = new WebSocket(`wss://attendsync-6dn6.onrender.com/ws/attendance/${currentSectionCode}`);

    ws.onopen = () => setWsStatus('Status: Active');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const now = new Date();
      const newLog = {
        id: Date.now(),
        name: data.name,
        studentId: data.studentId,
        type: data.type,
        rawDate: getTodayRaw(),
        displayDate: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: data.time,
        status: data.status
      };
      setScannedLogs(prev => [newLog, ...prev]);
      toast.success(`Identity Confirmed: ${data.name}`, { style: { background: '#022c22', color: '#34d399', border: '1px solid #059669' } });
    };
    ws.onclose = () => setWsStatus('Status: Offline');
    ws.onerror = () => setWsStatus('Status: Error');
    return () => ws.close();
  }, [currentSectionCode]);

  const handleSubjectChange = (sectionCode) => {
    if (sectionCode === activeSection) return;
    setActiveSection(sectionCode);
    setNewStudent(prev => ({ ...prev, section_code: sectionCode }));
  };

  const handleExportDailyCSV = async () => {
    if (!currentSectionCode) return;
    try {
      const res = await fetch(`https://attendsync-6dn6.onrender.com/api/export/attendance/${currentSectionCode}?date_filter=${dateFilter}`);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.detail || "No records found.", { style: { background: '#450a0a', color: '#f87171', border: '1px solid #991b1b' } });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Data_Export_${currentSectionCode}_${dateFilter}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Data Extraction Complete!");
    } catch (err) {
      toast.error("Extraction Failed.");
    }
  };

  const handleExportOverallCSV = async () => {
    if (!currentSectionCode) return;
    try {
      const res = await fetch(`https://attendsync-6dn6.onrender.com/api/export/grades/${currentSectionCode}`);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.detail || "No records found.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Vault_Export_${currentSectionCode}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Vault Data Extracted!");
    } catch (err) {
      toast.error("Extraction Failed.");
    }
  };

  const handleAssignClass = async (e) => {
    e.preventDefault();
    if (!newClassForm.name || !newClassForm.section_code) return;
    try {
      const res = await fetch(`https://attendsync-6dn6.onrender.com/api/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newClassForm, teacher_id: teacherId })
      });
      if (res.ok) {
        const added = await res.json();
        const newClassObj = { id: added.class.id, name: added.class.name, section: added.class.section_code, students: 0 };
        setClasses(prev => [...prev, newClassObj]);
        setActiveSection(newClassObj.section);
        setNewStudent(prev => ({ ...prev, section_code: newClassObj.section }));
        setShowClassModal(false);
        setNewClassForm({ name: '', section_code: ALLOWED_SECTIONS[0] });
        toast.success("New Protocol Assigned!");
      } else {
        const err = await res.json();
        toast.error(err.detail);
      }
    } catch (err) { toast.error("System Error."); }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudent.student_number || !newStudent.name || !newStudent.section_code) return toast.error("Incomplete Data.");
    try {
      const res = await fetch(`https://attendsync-6dn6.onrender.com/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });
      if (res.ok) {
        const addedStudent = await res.json();
        setRoster(prev => [...prev, addedStudent.student]);
        setClasses(prev => prev.map(c => c.section === currentSectionCode ? { ...c, students: c.students + 1 } : c));
        setNewStudent({ student_number: '', program: 'BSIT', section_code: currentSectionCode, name: '', email: '' });
        toast.success(`Identity Registered: ${addedStudent.student.name}`);
      } else {
        const err = await res.json();
        toast.error(typeof err.detail === 'string' ? err.detail : "Data Validation Failed.");
      }
    } catch (err) { toast.error("Registration Failed."); }
  };

  const handleRemoveStudent = async (studentNumber) => {
    if(!window.confirm("Purge this identity from the database?")) return;
    try {
      const res = await fetch(`https://attendsync-6dn6.onrender.com/api/students/${studentNumber}`, { method: 'DELETE' });
      if (res.ok) {
        setRoster(roster.filter(student => student.student_number !== studentNumber));
        setClasses(prev => prev.map(c => c.section === currentSectionCode ? { ...c, students: Math.max(0, c.students - 1) } : c));
        toast.success("Identity Purged.");
      }
    } catch (err) { toast.error("Purge Failed."); }
  };

  const attendanceList = roster.map(student => {
    const scanRecord = scannedLogs.find(log => log.studentId === student.student_number && log.rawDate === (dateFilter || getTodayRaw()) && log.type === 'QR Pass');
    return { 
      ...student, 
      status: scanRecord ? 'PRESENT' : 'ABSENT',
      scanDate: scanRecord ? scanRecord.displayDate : '-',
      scanTime: scanRecord ? scanRecord.time : '-'
    };
  });

  const filteredAttendance = attendanceList.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.student_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = sectionFilter === 'All' || student.section_code === sectionFilter;
    const matchesStatus = statusFilter === 'All' || student.status === statusFilter.toUpperCase();
    return matchesSearch && matchesSection && matchesStatus;
  });

  const presentTodayCount = scannedLogs.filter(log => log.rawDate === getTodayRaw() && log.type === 'QR Pass').length;
  const currentTotalEnrolled = classes.find(c => c.section === activeSection)?.students || 0;

  const startCamera = async () => {
    setCameraError(null);
    const qrRegion = document.getElementById("qr-reader");
    if (!qrRegion || !currentSectionCode) return;
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) await html5QrCodeRef.current.stop();
      const html5QrCode = new Html5Qrcode("qr-reader", { formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ] });
      html5QrCodeRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (html5QrCodeRef.current) html5QrCodeRef.current.pause(true);
          try {
            let parsed = null;
            let isOverall = false;
            try {
              parsed = JSON.parse(decodedText);
              if (parsed.type === 'Overall Compilation') isOverall = true;
            } catch(e){}

            if (isOverall) {
               const res = await fetch(`https://attendsync-6dn6.onrender.com/api/scan/overall`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   student_id: parsed.student_id,
                   section_code: currentSectionCode, 
                   grading_period: parsed.grading_period,
                   scores_data: JSON.stringify(parsed.data)
                 })
               });
               if (!res.ok) {
                 const err = await res.json();
                 toast.error(`Auth Failed: ${err.detail}`);
               }
            } else {
               const res = await fetch(`https://attendsync-6dn6.onrender.com/api/scan`, { 
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ qr_token: decodedText, section_code: currentSectionCode })
               });
               const data = await res.json();
               if (!res.ok) {
                 toast.error(`Auth Failed: ${data.detail}`);
               }
            }
          } catch (e) { toast.error("Uplink Error during processing."); }
          
          setTimeout(() => { try { html5QrCodeRef.current.resume(); } catch (e) {} }, 5000);
        }, () => {} 
      );
      setIsCameraActive(true);
    } catch (err) {
      setIsCameraActive(false);
      setCameraError("Optical Sensor Offline. (Permission Denied)");
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try { await html5QrCodeRef.current.stop(); setIsCameraActive(false); } catch (err) {}
    }
  };

  useEffect(() => {
    if (activeTab === 'scanner' && currentSectionCode) setTimeout(() => startCamera(), 100); 
    else stopCamera();
    return () => stopCamera();
  }, [activeTab, activeSection, currentSectionCode]);

  const SearchIcon = () => (
    <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-[#030712] text-slate-200 relative overflow-hidden selection:bg-cyan-500/30">
      
      <style>{`
        .bg-tech-grid { background-size: 40px 40px; background-image: linear-gradient(to right, rgba(6, 182, 212, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.05) 1px, transparent 1px); mask-image: radial-gradient(circle at center, black 40%, transparent 100%); }
        .orb-1 { position: absolute; top: -10%; left: -10%; width: 40vw; height: 40vw; background: radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%); border-radius: 50%; filter: blur(40px); z-index: 0; pointer-events: none; }
        .orb-2 { position: absolute; bottom: -10%; right: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%); border-radius: 50%; filter: blur(50px); z-index: 0; pointer-events: none; }
        .glass-panel { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(6, 182, 212, 0.2); box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(6, 182, 212, 0.05); }
        #qr-reader { width: 100% !important; height: 100% !important; border: none !important; background: transparent !important; }
        #qr-reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; border-radius: 16px !important; opacity: 0.85; filter: contrast(1.1) brightness(1.1); }
        .loader { border: 3px solid rgba(6,182,212,0.2); border-top: 3px solid #06b6d4; border-radius: 50%; width: 36px; height: 36px; animation: spin 1s linear infinite; box-shadow: 0 0 15px rgba(6,182,212,0.5); }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes scanLaserHUD { 0%, 100% { top: 5%; opacity: 0; } 10%, 90% { opacity: 1; } 50% { top: 95%; } }
        .animate-laser-hud { animation: scanLaserHUD 2.5s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.3); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.6); }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.8; filter: invert(1) sepia(1) saturate(5) hue-rotate(175deg); }
      `}</style>

      <div className="absolute inset-0 bg-tech-grid z-0"></div>
      <div className="orb-1"></div>
      <div className="orb-2"></div>

      {showClassModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-md p-8 rounded-2xl animate-in zoom-in-95 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <h2 className="text-xl font-bold mb-6 text-cyan-300 tracking-wide uppercase">Initialize New Protocol</h2>
            <form onSubmit={handleAssignClass} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block text-cyan-500/70">Protocol / Course Name</label>
                <input type="text" placeholder="e.g. Data Structures" required value={newClassForm.name} onChange={e => setNewClassForm({...newClassForm, name: e.target.value})}
                  className="w-full px-4 py-3 text-sm rounded-lg bg-slate-900/50 border border-cyan-500/30 text-cyan-50 placeholder-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all duration-300" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block text-cyan-500/70">Section (Section)</label>
                <select required value={newClassForm.section_code} onChange={e => setNewClassForm({...newClassForm, section_code: e.target.value})}
                  className="w-full px-4 py-3 text-sm rounded-lg bg-slate-900/50 border border-cyan-500/30 text-cyan-50 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all duration-300 [&>option]:bg-slate-900">
                  {ALLOWED_SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowClassModal(false)} className="flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-widest bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors duration-300">Abort</button>
                <button type="submit" className="flex-1 py-3 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-400/50 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]">Deploy Protocol</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedGradeRecord && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-xl rounded-2xl overflow-hidden flex flex-col border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)] text-indigo-50">
            <div className="p-5 border-b border-indigo-500/20 flex justify-between items-center bg-indigo-950/30">
              <h2 className="text-lg font-bold tracking-widest uppercase text-indigo-300">
                {selectedGradeRecord.name} <span className="text-indigo-500/50 mx-2">|</span> {selectedGradeRecord.grading_period}
              </h2>
              <button onClick={() => setSelectedGradeRecord(null)} className="p-2 font-bold text-rose-500 hover:text-rose-400 hover:drop-shadow-[0_0_8px_rgba(244,63,94,0.8)] transition-all duration-300">CLOSE</button>
            </div>
            <div className="p-6">
              {(() => {
                try {
                  const data = JSON.parse(selectedGradeRecord.scores_data || "{}");
                  const scores = data.scores || {};
                  const attendance = data.attendance || {};
                  const cols = selectedGradeRecord.grading_period === 'Finals' ? [1,2] : [1,2,3,4];
                  return (
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="border-b-2 border-indigo-500/30 text-indigo-400 uppercase tracking-widest text-[10px]">
                          <th className="p-2 font-bold text-left">Vector</th>
                          {cols.map(c => <th key={c} className="p-2 font-bold w-12 md:w-16">N-{c}</th>)}
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-indigo-500/10">
                        {['quiz', 'recitation', 'project'].map(crit => (
                          <tr key={crit}>
                            <td className="p-3 font-medium text-left uppercase tracking-wider text-indigo-200 text-[10px] md:text-xs">{crit}</td>
                            {cols.map(c => (
                              <td key={c}>
                                <div className="w-10 md:w-12 h-9 mx-auto flex items-center justify-center font-mono font-bold rounded bg-indigo-950/50 border border-indigo-500/20 text-indigo-300 transition-all duration-300 hover:bg-indigo-900/50">
                                  {scores[crit]?.[c] || scores[crit]?.[String(c)] || '-'}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="bg-indigo-500/10">
                          <td className="p-3 text-left font-bold uppercase tracking-wider text-cyan-400 text-[10px] md:text-xs">Uplink (ATT)</td>
                          {cols.map(c => {
                            const isPresent = attendance[c] || attendance[String(c)];
                            return (
                              <td key={c}>
                                <div className={`w-3 h-3 mx-auto rounded-full transition-all duration-300 ${isPresent ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-slate-700/50 border border-slate-600'}`}></div>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  );
                } catch (err) {
                  return <p className="text-rose-400 text-xs font-mono uppercase tracking-widest text-center py-6">Error parsing matrix payload.</p>;
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-72 flex-col z-10 glass-panel border-y-0 border-l-0 border-r border-cyan-500/20 min-h-screen">
        <div className="p-6 border-b border-cyan-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-bold px-2 py-1 rounded text-[9px] tracking-[0.2em] shadow-[0_0_10px_rgba(6,182,212,0.3)]">ICCT</span>
            <span className="font-bold tracking-widest text-sm uppercase text-slate-100">AttendSync</span>
          </div>
          <div className="relative z-10">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold px-2.5 py-0.5 rounded uppercase tracking-[0.2em] mb-3 inline-block">Teacher</span>
            <p className="font-bold text-lg leading-tight mt-1 text-cyan-50">Prof. {displayName}</p>
            <p className="text-xs text-cyan-500/60 mt-1 font-mono tracking-wider">ID: {teacherId}</p>
          </div>
        </div>

        <div className="flex-1 py-6 overflow-y-auto flex flex-col">
          <h3 className="text-[9px] font-bold text-cyan-500/70 uppercase tracking-[0.2em] mb-4 px-6">Active Subjects</h3>
          
          <div className="px-4 mb-5">
            <button onClick={() => setShowClassModal(true)} className="w-full py-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.15em] rounded-lg transition-all duration-300 border border-cyan-500/30 border-dashed hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]">
               Add Class
            </button>
          </div>

          <div className="space-y-2 px-4 flex-1">
            {classes.map((cls) => (
              <button key={cls.id} onClick={() => handleSubjectChange(cls.section)}
                className={`w-full py-3.5 px-4 text-left rounded-lg text-sm transition-all duration-300 relative overflow-hidden group ${activeSection === cls.section ? 'bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-slate-800/30 border border-transparent hover:border-cyan-500/30'}`}>
                {activeSection === cls.section && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)]"></div>}
                <p className={`font-bold text-sm tracking-wide transition-colors duration-300 ${activeSection === cls.section ? 'text-cyan-100' : 'text-slate-400 group-hover:text-cyan-200'}`}>{cls.name}</p>
                <p className="text-[10px] mt-1 text-cyan-500/60 font-mono tracking-widest">SEC: {cls.section}</p>
              </button>
            ))}
            {classes.length === 0 && !isLoading && <p className="text-[10px] uppercase tracking-widest px-4 text-slate-500 text-center mt-6">No routines found.</p>}
          </div>
        </div>

        <div className="p-4 border-t border-cyan-500/20 space-y-2">
          <button onClick={handleLogout} className="w-full py-3 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-300 text-left px-4 flex items-center font-bold tracking-widest uppercase border border-transparent hover:border-rose-500/30">
             <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> Terminate Session
          </button>
        </div>
      </div>

      {/* Mobile Sticky Header */}
      <div className="md:hidden flex justify-between items-center p-4 border-b border-cyan-500/20 glass-panel z-50 sticky top-0">
        <div>
          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-[0.2em] mb-1.5 inline-block">Teacher Node</span>
          <p className="font-bold text-base leading-tight text-cyan-50">Prof. {displayName}</p>
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
          {classes.length > 0 && (
            <div>
              <h3 className="text-[9px] font-bold text-cyan-500/70 uppercase tracking-[0.2em] mb-3">Module Control</h3>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => { setActiveTab('scanner'); setIsMobileMenuOpen(false); }} className={`py-3.5 px-4 text-left rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${activeTab === 'scanner' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-slate-800/50 border border-slate-700 text-slate-300'}`}>QR Scanner</button>
                <button onClick={() => { setActiveTab('management'); setIsMobileMenuOpen(false); }} className={`py-3.5 px-4 text-left rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${activeTab === 'management' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-slate-800/50 border border-slate-700 text-slate-300'}`}>Add Student</button>
                <button onClick={() => { setActiveTab('attendance'); setIsMobileMenuOpen(false); }} className={`py-3.5 px-4 text-left rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${activeTab === 'attendance' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-slate-800/50 border border-slate-700 text-slate-300'}`}>Master Logs</button>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-[9px] font-bold text-cyan-500/70 uppercase tracking-[0.2em] mb-3">Active Subjects</h3>
            <div className="flex flex-col gap-2">
              {classes.map(cls => (
                <button key={cls.id} onClick={() => { handleSubjectChange(cls.section); setIsMobileMenuOpen(false); }} className={`py-3.5 px-4 text-left rounded-xl text-xs font-bold tracking-widest uppercase transition-all relative overflow-hidden ${activeSection === cls.section ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'bg-slate-800/50 border border-slate-700 text-slate-300'}`}>
                  {activeSection === cls.section && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400"></div>}
                  <div className="flex justify-between items-center">
                    <span>{cls.name}</span>
                    <span className="opacity-60 text-[9px]">{cls.section}</span>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => { setShowClassModal(true); setIsMobileMenuOpen(false); }} className="w-full mt-3 py-3.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all border border-cyan-500/30 border-dashed">Add Class</button>
          </div>
          
          <button onClick={handleLogout} className="w-full mt-auto py-4 text-xs text-rose-400 bg-rose-500/10 rounded-xl font-bold tracking-widest uppercase border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)] flex items-center justify-center">
            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> Terminate Session
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 p-4 md:p-8 lg:p-10 w-full relative z-10 ${isMobileMenuOpen ? 'overflow-hidden max-h-[calc(100vh-75px)]' : 'overflow-y-auto'}`}>
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center glass-panel">
            <div className="loader mb-4"></div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 animate-pulse">Syncing Database...</p>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-5 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                {classes.length === 0 ? "System Standby" : activeSubjectName}
              </h1>
              
              {classes.length > 0 && (
                <div className="hidden md:inline-flex p-1.5 rounded-xl glass-panel gap-1">
                  <button onClick={() => setActiveTab('scanner')} className={`px-5 py-2.5 text-[11px] uppercase tracking-widest font-bold rounded-lg transition-all duration-300 whitespace-nowrap ${activeTab === 'scanner' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-slate-400 hover:text-cyan-200 hover:bg-white/5 border border-transparent'}`}>QR Scanner</button>
                  <button onClick={() => setActiveTab('management')} className={`px-5 py-2.5 text-[11px] uppercase tracking-widest font-bold rounded-lg transition-all duration-300 whitespace-nowrap ${activeTab === 'management' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-slate-400 hover:text-cyan-200 hover:bg-white/5 border border-transparent'}`}>ADD Student</button>
                  <button onClick={() => setActiveTab('attendance')} className={`px-5 py-2.5 text-[11px] uppercase tracking-widest font-bold rounded-lg transition-all duration-300 whitespace-nowrap ${activeTab === 'attendance' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-slate-400 hover:text-cyan-200 hover:bg-white/5 border border-transparent'}`}>Master Logs</button>
                </div>
              )}
            </div>
            
            <div className="flex gap-4 w-full lg:w-auto">
              <div className="flex-1 lg:flex-none px-8 py-5 rounded-2xl glass-panel flex flex-col items-center justify-center min-w-[130px] border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-500/80 mb-2 relative z-10">Present Today</p>
                <p className="text-4xl font-mono font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)] relative z-10">{presentTodayCount}</p>
              </div>
              <div className="flex-1 lg:flex-none px-8 py-5 rounded-2xl glass-panel flex flex-col items-center justify-center min-w-[130px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-cyan-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-500/80 mb-2 relative z-10">Total Students</p>
                <p className="text-4xl font-mono font-black text-cyan-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] relative z-10">{currentTotalEnrolled}</p>
              </div>
            </div>
          </div>

          {classes.length > 0 && activeTab === 'scanner' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="col-span-1 p-8 rounded-3xl glass-panel flex flex-col items-center justify-center relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
                <div className="text-center mb-8 relative z-10">
                  <h2 className="text-xl font-black tracking-[0.15em] uppercase text-cyan-100 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">Qr Scanner</h2>
                  <p className="text-[10px] mt-2 text-cyan-500/70 font-mono tracking-widest uppercase">Awaiting QR Signature</p>
                </div>
                
                <div className="w-full max-w-[260px] aspect-square relative flex items-center justify-center bg-slate-900/50 rounded-2xl shadow-inner border border-slate-800">
                  <div className="absolute top-[-2px] left-[-2px] w-10 h-10 border-t-4 border-l-4 border-cyan-400 rounded-tl-2xl z-20 pointer-events-none drop-shadow-[0_0_8px_rgba(34,211,238,1)]"></div>
                  <div className="absolute top-[-2px] right-[-2px] w-10 h-10 border-t-4 border-r-4 border-cyan-400 rounded-tr-2xl z-20 pointer-events-none drop-shadow-[0_0_8px_rgba(34,211,238,1)]"></div>
                  <div className="absolute bottom-[-2px] left-[-2px] w-10 h-10 border-b-4 border-l-4 border-cyan-400 rounded-bl-2xl z-20 pointer-events-none drop-shadow-[0_0_8px_rgba(34,211,238,1)]"></div>
                  <div className="absolute bottom-[-2px] right-[-2px] w-10 h-10 border-b-4 border-r-4 border-cyan-400 rounded-br-2xl z-20 pointer-events-none drop-shadow-[0_0_8px_rgba(34,211,238,1)]"></div>
                  
                  {isCameraActive && <div className="absolute top-0 left-2 right-2 h-[2px] bg-cyan-300 shadow-[0_0_15px_3px_rgba(34,211,238,0.9)] z-30 animate-laser-hud pointer-events-none rounded-full"></div>}
                  <div id="qr-reader" className="w-full h-full rounded-2xl overflow-hidden relative z-0"></div>

                  {!isCameraActive && (
                    <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 glass-panel border-none bg-slate-900/90">
                      <p className="text-[10px] text-rose-400 font-mono mb-6 uppercase tracking-widest">{cameraError || "Sensor Offline."}</p>
                      <button onClick={startCamera} className="px-6 py-3 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-400/50 font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)]">Initialize Feed</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-1 lg:col-span-2 rounded-3xl glass-panel flex flex-col overflow-hidden">
                <div className="px-8 py-6 border-b border-cyan-500/20 flex justify-between items-center bg-slate-900/30">
                  <h3 className="font-bold text-sm uppercase tracking-[0.15em] text-cyan-100">Live Update</h3>
                  <span className={`text-[9px] uppercase tracking-[0.2em] font-bold flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors duration-300 ${
                    wsStatus.includes('Active') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' :
                    wsStatus.includes('Error') ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {wsStatus.includes('Active') && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_rgba(52,211,153,1)]"></div>}
                    {wsStatus}
                  </span>
                </div>
                <div className="overflow-x-auto flex-1 p-2">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="px-6 py-4 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em]">Student</th>
                        <th className="px-6 py-4 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em]">Payload Type</th>
                        <th className="px-6 py-4 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em]">Timestamp</th>
                        <th className="px-6 py-4 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em] text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {scannedLogs.filter(log => log.rawDate === getTodayRaw()).length === 0 ? (
                         <tr><td colSpan="4" className="px-8 py-12 text-center text-[11px] font-mono uppercase tracking-widest text-slate-500">Awaiting incoming data streams.</td></tr>
                      ) : (
                        scannedLogs.filter(log => log.rawDate === getTodayRaw()).map((log) => (
                          <tr key={log.id} className="hover:bg-cyan-500/5 transition-colors duration-300">
                            <td className="px-6 py-4">
                              <p className="font-bold text-[13px] text-cyan-100 tracking-wide">{log.name}</p>
                              <p className="text-[10px] mt-1 text-slate-500 font-mono">{log.studentId}</p>
                            </td>
                            <td className="px-6 py-4"><span className="text-[11px] font-mono tracking-widest text-indigo-400 uppercase">{log.type}</span></td>
                            <td className="px-6 py-4 text-[11px] font-mono text-slate-400">{log.time}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-[0.2em] uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                {log.status}
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
          )}

          {classes.length > 0 && activeTab === 'management' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-8 rounded-3xl glass-panel relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="font-bold text-[13px] uppercase tracking-[0.2em] mb-6 text-indigo-300 flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                  Register New Student
                </h3>
                <form onSubmit={handleAddStudent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-end relative z-10">
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 text-indigo-300/70">Student Number</label>
                    <input type="text" placeholder="UA202300370" required value={newStudent.student_number} onChange={(e) => setNewStudent({...newStudent, student_number: e.target.value})}
                      className="px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-indigo-500/30 text-indigo-50 placeholder-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all duration-300" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 text-indigo-300/70">Student Name</label>
                    <input type="text" placeholder="Juan Dela Cruz" required value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                      className="px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-indigo-500/30 text-indigo-50 placeholder-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all duration-300" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 text-indigo-300/70">Email Account</label>
                    <input type="email" placeholder="student@icct.edu.ph" required value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                      className="px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-indigo-500/30 text-indigo-50 placeholder-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all duration-300" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 text-indigo-300/70">Designation</label>
                    <select value={newStudent.program} onChange={(e) => setNewStudent({...newStudent, program: e.target.value})}
                      className="px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-indigo-500/30 text-indigo-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all duration-300 [&>option]:bg-slate-900">
                      <option value="BSIT">BSIT</option><option value="BSCS">BSCS</option><option value="ACT">ACT</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2 text-indigo-300/70">Section</label>
                    <select value={newStudent.section_code} onChange={(e) => setNewStudent({...newStudent, section_code: e.target.value})}
                      className="px-4 py-3 text-xs font-mono rounded-xl bg-slate-900/60 border border-indigo-500/30 text-indigo-50 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all duration-300 [&>option]:bg-slate-900">
                      {classes.map(c => <option key={c.id} value={c.section}>{c.section}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="w-full px-6 py-3 h-[42px] bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-400/50 font-bold text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] whitespace-nowrap">
                    ADD STUDENT
                  </button>
                </form>
              </div>

              <div className="rounded-3xl glass-panel flex flex-col overflow-hidden">
                <div className="overflow-x-auto flex-1 p-2">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-slate-700/50 bg-slate-900/30">
                        <th className="px-8 py-5 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em]">Student</th>
                        <th className="px-8 py-5 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em]">Program</th>
                        <th className="px-8 py-5 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em]">Email</th>
                        <th className="px-8 py-5 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em] text-right">Overrides</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {roster.length === 0 ? (
                        <tr><td colSpan="4" className="px-8 py-12 text-center text-[11px] font-mono uppercase tracking-widest text-slate-500">Database Empty.</td></tr>
                      ) : (
                        roster.map((student) => (
                          <tr key={student.id} className="hover:bg-cyan-500/5 transition-colors duration-300">
                            <td className="px-8 py-5">
                              <p className="font-bold text-[13px] text-cyan-100 tracking-wide">{student.name}</p>
                              <p className="text-[10px] mt-1 text-slate-500 font-mono">{student.student_number}</p>
                            </td>
                            <td className="px-8 py-5">
                              <span className="inline-flex items-center px-2.5 py-1 rounded text-[9px] font-bold tracking-[0.2em] uppercase bg-slate-800 border border-slate-700 text-slate-300">{student.program}</span>
                            </td>
                            <td className="px-8 py-5 text-[11px] font-mono text-slate-400">{student.email}</td>
                            <td className="px-8 py-5 text-right">
                              <button onClick={() => handleRemoveStudent(student.student_number)} className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500 hover:text-rose-400 hover:drop-shadow-[0_0_5px_rgba(244,63,94,0.8)] transition-all duration-300">Purge</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {classes.length > 0 && activeTab === 'attendance' && (
            <div className="rounded-3xl glass-panel flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-8 pt-5 pb-3 border-b border-cyan-500/20 bg-slate-900/30 gap-5">
                <div className="flex gap-8">
                  <button onClick={() => setRecordTab('daily')} className={`pb-3 text-[10px] font-bold uppercase tracking-[0.2em] border-b-2 transition-all duration-300 bg-transparent ${recordTab === 'daily' ? 'border-cyan-400 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'border-transparent text-slate-500 hover:text-cyan-500/50'}`}>
                    Daily Logs
                  </button>
                  <button onClick={() => setRecordTab('overall')} className={`pb-3 text-[10px] font-bold uppercase tracking-[0.2em] border-b-2 transition-all duration-300 bg-transparent ${recordTab === 'overall' ? 'border-indigo-400 text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]' : 'border-transparent text-slate-500 hover:text-indigo-500/50'}`}>
                    Master Vault
                  </button>
                </div>

                {recordTab === 'daily' ? (
                  <button onClick={handleExportDailyCSV} className="px-5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-400/50 text-[9px] font-bold uppercase tracking-[0.2em] rounded-lg transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.2)] flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Extract CSV
                  </button>
                ) : (
                  <button onClick={handleExportOverallCSV} className="px-5 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-400/50 text-[9px] font-bold uppercase tracking-[0.2em] rounded-lg transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.2)] flex items-center gap-2">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Extract CSV
                  </button>
                )}
              </div>

              {recordTab === 'daily' && (
                <>
                  <div className="p-6 border-b border-cyan-500/10 flex flex-col xl:flex-row justify-between items-center gap-5">
                    <div className="flex items-center gap-4 w-full xl:w-auto">
                      <h3 className="font-bold text-sm uppercase tracking-[0.15em] text-cyan-100">Daily Attendance</h3>
                      <span className="text-[9px] font-bold px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 tracking-widest uppercase">Matches: {filteredAttendance.length}</span>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                      <div className="relative w-full md:w-56">
                        <SearchIcon />
                        <input type="text" placeholder="Query ID or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-50 placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all duration-300" />
                      </div>
                      <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full md:w-auto px-4 py-2.5 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all duration-300 cursor-pointer" />
                      <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}
                        className="w-full md:w-auto px-4 py-2.5 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all duration-300 cursor-pointer [&>option]:bg-slate-900">
                        <option value="All">Global Nodes</option>
                        {classes.map(c => <option key={c.id} value={c.section}>{c.section}</option>)}
                      </select>
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full md:w-auto px-4 py-2.5 text-xs font-mono rounded-xl bg-slate-900/60 border border-cyan-500/30 text-cyan-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all duration-300 cursor-pointer [&>option]:bg-slate-900">
                        <option value="All">All Status</option>
                        <option value="Present">Present Only</option>
                        <option value="Absent">Absent Only</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto flex-1 p-2">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="px-8 py-4 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em]">Student</th>
                          <th className="px-8 py-4 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em]">Program/Section</th>
                          <th className="px-8 py-4 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em]">Timestamp</th>
                          <th className="px-8 py-4 font-bold text-[9px] text-cyan-500/70 uppercase tracking-[0.2em] text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {filteredAttendance.length === 0 ? (
                          <tr><td colSpan="4" className="px-8 py-12 text-center text-[11px] font-mono uppercase tracking-widest text-slate-500">No records in selected timeframe.</td></tr>
                        ) : (
                          filteredAttendance.map((student) => (
                            <tr key={student.id} className="hover:bg-cyan-500/5 transition-colors duration-300">
                              <td className="px-8 py-4">
                                <p className="font-bold text-[13px] text-cyan-100 tracking-wide">{student.name}</p>
                                <p className="text-[10px] mt-1 text-slate-500 font-mono">{student.student_number}</p>
                              </td>
                              <td className="px-8 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase bg-slate-800 border border-slate-700 text-slate-300">{student.program}</span>
                                  <span className="text-[11px] font-mono text-cyan-500/80">{student.section_code}</span>
                                </div>
                              </td>
                              <td className="px-8 py-4">
                                {student.status === 'PRESENT' ? (
                                  <div className="flex flex-col">
                                    <span className="text-[12px] font-bold text-cyan-300">{student.scanDate}</span>
                                    <span className="text-[11px] font-mono text-slate-400">{student.scanTime}</span>
                                  </div>
                                ) : ( <span className="text-[12px] text-slate-600">—</span> )}
                              </td>
                              <td className="px-8 py-4 text-right">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-[0.2em] uppercase border ${student.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                                  {student.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {recordTab === 'overall' && (
                <>
                  <div className="p-6 border-b border-indigo-500/10">
                    <h3 className="font-bold text-sm uppercase tracking-[0.15em] text-indigo-200">Submissions</h3>
                  </div>
                  <div className="overflow-x-auto flex-1 p-2">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-slate-700/50">
                          <th className="px-8 py-4 font-bold text-[9px] text-indigo-500/70 uppercase tracking-[0.2em]">Student</th>
                          <th className="px-8 py-4 font-bold text-[9px] text-indigo-500/70 uppercase tracking-[0.2em]">Cycle Phase</th>
                          <th className="px-8 py-4 font-bold text-[9px] text-indigo-500/70 uppercase tracking-[0.2em]">Sync Time</th>
                          <th className="px-8 py-4 font-bold text-[9px] text-indigo-500/70 uppercase tracking-[0.2em] text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {overallGrades.length === 0 ? (
                          <tr><td colSpan="4" className="px-8 py-12 text-center text-[11px] font-mono uppercase tracking-widest text-slate-500">Vault empty. No payloads received.</td></tr>
                        ) : (
                          overallGrades.map(grade => (
                            <tr key={grade.id} className="hover:bg-indigo-500/5 transition-colors duration-300">
                              <td className="px-8 py-4">
                                <p className="font-bold text-[13px] text-indigo-100 tracking-wide">{grade.name}</p>
                                <p className="text-[10px] mt-1 text-slate-500 font-mono">{grade.student_id}</p>
                              </td>
                              <td className="px-8 py-4">
                                <span className="inline-flex px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-[0.2em] uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                                  {grade.grading_period}
                                </span>
                              </td>
                              <td className="px-8 py-4 text-[11px] font-mono text-slate-400">{grade.timestamp}</td>
                              <td className="px-8 py-4 text-right">
                                <button onClick={() => setSelectedGradeRecord(grade)} className="px-5 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-400/50 font-bold text-[9px] uppercase tracking-[0.2em] rounded-lg transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                                  Access Matrix
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}