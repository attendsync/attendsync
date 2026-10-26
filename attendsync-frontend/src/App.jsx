// src/App.jsx
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import LoginGateway from './components/LoginGateway';
import StudentPortal from './components/StudentPortal';
import TeacherPortal from './components/TeacherPortal'; 
import StudentRegister from './components/StudentRegister';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  
  const [role, setRole] = useState('student');
  const [schoolId, setSchoolId] = useState('');
  const [password, setPassword] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  // Persist session from localStorage
  useEffect(() => {
    const savedLoginStatus = localStorage.getItem('isLoggedIn');
    if (savedLoginStatus === 'true') {
      setIsLoggedIn(true);
      setRole(localStorage.getItem('role') || 'student');
      setSchoolId(localStorage.getItem('schoolId') || '');
      setTeacherName(localStorage.getItem('teacherName') || '');
      setToken(localStorage.getItem('token') || '');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`http://localhost:8000/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          password: password,
          role: role
        })
      });

      if (res.ok) {
        const resData = await res.json();
        
        setIsLoggedIn(true);
        setToken(resData.access_token || '');
        if (resData.name) setTeacherName(resData.name);

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('role', role);
        localStorage.setItem('schoolId', schoolId);
        localStorage.setItem('token', resData.access_token || '');
        if (resData.name) localStorage.setItem('teacherName', resData.name);

        toast.success(`Welcome back, ${resData.name || schoolId}!`);
      } else {
        const errData = await res.json();
        setError(errData.detail); 
        toast.error(errData.detail || "Login failed.");
      }
    } catch (err) {
      setError("Failed to connect to the server.");
      toast.error("Network error: Server unreachable.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSchoolId('');
    setPassword('');
    setTeacherName('');
    setToken('');
    setError('');
    
    localStorage.clear();
    toast.success("Signed out successfully.");
  };

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />

      {showRegister ? (
        <StudentRegister onBackToLogin={() => setShowRegister(false)} />
      ) : isLoggedIn && role === 'student' ? (
        <StudentPortal schoolId={schoolId} token={token} handleLogout={handleLogout} />
      ) : isLoggedIn && role === 'teacher' ? (
        <TeacherPortal schoolId={schoolId} teacherName={teacherName} token={token} handleLogout={handleLogout} />
      ) : (
        <LoginGateway 
          role={role}
          setRole={setRole}
          schoolId={schoolId}
          setSchoolId={setSchoolId}
          password={password}
          setPassword={setPassword}
          error={error}
          handleLogin={handleLogin}
          onRegisterClick={() => setShowRegister(true)} 
        />
      )}
    </>
  );
}

export default App;