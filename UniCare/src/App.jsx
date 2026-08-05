import React, { useState, useEffect } from 'react';
import CustomNavbar from './components/CustomNavbar';
import CustomFooter from './components/CustomFooter';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthSelectorPage from './pages/AuthSelectorPage';
import HospitalFlowPage from './pages/HospitalFlowPage';
import PatientFlowPage from './pages/PatientFlowPage';
import HospitalDashboardPage from './pages/HospitalDashboardPage';
import PatientDashboardPage from './pages/PatientDashboardPage';

function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('unicare_active_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('unicare_active_user', JSON.stringify(user));
    if (user.type === 'hospital') {
      setCurrentView('hospital-dashboard');
    } else {
      setCurrentView('patient-dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('unicare_active_user');
    setCurrentView('landing');
  };

  // Render view based on route state
  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage setView={setCurrentView} />;
      case 'auth-select':
        return <AuthSelectorPage setView={setCurrentView} />;
      case 'login':
        return <LoginPage setView={setCurrentView} onLogin={handleLogin} />;
      case 'register':
        return <RegisterPage setView={setCurrentView} />;
      case 'hospital-flow':
        return <HospitalFlowPage setView={setCurrentView} onLogin={handleLogin} />;
      case 'patient-flow':
        return <PatientFlowPage setView={setCurrentView} onLogin={handleLogin} />;
      case 'hospital-dashboard':
        return currentUser && currentUser.type === 'hospital' ? (
          <HospitalDashboardPage hospitalInfo={currentUser} />
        ) : (
          <HospitalFlowPage setView={setCurrentView} onLogin={handleLogin} />
        );
      case 'patient-dashboard':
        return currentUser && currentUser.type === 'patient' ? (
          <PatientDashboardPage patientInfo={currentUser} />
        ) : (
          <PatientFlowPage setView={setCurrentView} onLogin={handleLogin} />
        );
      default:
        return <LandingPage setView={setCurrentView} />;
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      {/* Navbar */}
      <CustomNavbar 
        currentView={currentView} 
        setView={setCurrentView} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Page Area */}
      <main className="flex-grow-1">
        {renderView()}
      </main>

      {/* Footer */}
      <CustomFooter setView={setCurrentView} />
    </div>
  );
}

export default App;
