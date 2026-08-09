import React, { useState, useEffect } from 'react';
import CustomNavbar from './components/CustomNavbar';
import CustomFooter from './components/CustomFooter';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthSelectorPage from './pages/AuthSelectorPage';
import HospitalFlowPage from './pages/HospitalFlowPage';
import PatientFlowPage from './pages/PatientFlowPage';
import HospitalRoleSelectorPage from './pages/HospitalRoleSelectorPage';
import HospitalAdminDashboardPage from './pages/HospitalAdminDashboardPage';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';

function App() {
  const getInitialView = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/admin') || path.startsWith('/super-admin')) {
      const savedAdmin = localStorage.getItem('unicare_super_admin');
      return savedAdmin ? 'super-admin-dashboard' : 'super-admin-login';
    }
    
    const savedUser = localStorage.getItem('unicare_active_user');
    const savedView = sessionStorage.getItem('unicare_current_view');

    if (savedUser && savedView && ['hospital-role-select', 'hospital-admin-dashboard'].includes(savedView)) {
      return savedView;
    }
    if (savedUser) {
      return 'hospital-role-select';
    }
    return savedView || 'landing';
  };

  const [currentView, setCurrentView] = useState(getInitialView);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('unicare_active_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [superAdminUser, setSuperAdminUser] = useState(() => {
    const saved = localStorage.getItem('unicare_super_admin');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeRole, setActiveRole] = useState(null); // 'doctor' | 'hospital-admin' | 'receptionist'

  // Sync scroll & sessionStorage view state on view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    sessionStorage.setItem('unicare_current_view', currentView);
  }, [currentView]);

  // Handle browser Back / Forward navigation cleanly
  useEffect(() => {
    const handlePopState = () => {
      const savedUser = localStorage.getItem('unicare_active_user');
      const savedView = sessionStorage.getItem('unicare_current_view');
      if (!savedUser && ['hospital-role-select', 'hospital-admin-dashboard'].includes(savedView)) {
        setCurrentView('landing');
      } else if (savedView) {
        setCurrentView(savedView);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('unicare_active_user', JSON.stringify(user));
    setCurrentView('hospital-role-select');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveRole(null);
    localStorage.removeItem('unicare_active_user');
    sessionStorage.removeItem('unicare_current_view');
    setCurrentView('landing');
  };

  const handleSuperAdminLoginSuccess = (adminData) => {
    setSuperAdminUser(adminData);
    window.history.pushState({}, '', '/admin/dashboard');
    setCurrentView('super-admin-dashboard');
  };

  const handleSuperAdminLogout = () => {
    setSuperAdminUser(null);
    localStorage.removeItem('unicare_super_admin');
    sessionStorage.removeItem('unicare_current_view');
    window.history.pushState({}, '', '/admin/login');
    setCurrentView('super-admin-login');
  };

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    if (role === 'hospital-admin') {
      setCurrentView('hospital-admin-dashboard');
    } else {
      alert(`Role selected: ${role.toUpperCase()}. Portal login for ${role} selected.`);
    }
  };

  const isSuperAdminView = currentView === 'super-admin-login' || currentView === 'super-admin-dashboard';
  const isIsolatedDashboard = currentView === 'hospital-role-select' || currentView === 'hospital-admin-dashboard';

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
      case 'hospital-role-select':
        return (
          <HospitalRoleSelectorPage 
            hospitalInfo={currentUser}
            onSelectRole={handleRoleSelect}
            onLogout={handleLogout}
          />
        );
      case 'hospital-admin-dashboard':
        return (
          <HospitalAdminDashboardPage 
            hospitalInfo={currentUser}
            onBackToRoleSelect={() => setCurrentView('hospital-role-select')}
            onLogout={handleLogout}
          />
        );
      case 'super-admin-login':
        return (
          <SuperAdminLoginPage 
            onLoginSuccess={handleSuperAdminLoginSuccess} 
            onBackToSite={() => {
              window.history.pushState({}, '', '/');
              setCurrentView('landing');
            }} 
          />
        );
      case 'super-admin-dashboard':
        return (
          <SuperAdminDashboardPage 
            adminUser={superAdminUser} 
            onLogout={handleSuperAdminLogout} 
          />
        );
      default:
        return <LandingPage setView={setCurrentView} />;
    }
  };

  if (isSuperAdminView || isIsolatedDashboard) {
    return (
      <div className="bg-light min-vh-100">
        {renderView()}
      </div>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <CustomNavbar 
        currentView={currentView} 
        setView={setCurrentView} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <main className="flex-grow-1">
        {renderView()}
      </main>
      <CustomFooter setView={setCurrentView} />
    </div>
  );
}

export default App;
