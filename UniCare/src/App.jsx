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
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';

function App() {
  const getInitialView = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/admin') || path.startsWith('/super-admin')) return 'landing';
    const savedUser = localStorage.getItem('unicare_active_user');
    if (savedUser) {
      try {
        if (JSON.parse(savedUser)?.id === 'HOSP-DEMO') {
          localStorage.removeItem('unicare_active_user');
          sessionStorage.removeItem('unicare_current_view');
          return 'landing';
        }
      } catch {
        localStorage.removeItem('unicare_active_user');
      }
    }
    const savedView = sessionStorage.getItem('unicare_current_view');

    if (savedUser && savedView && ['hospital-admin-dashboard'].includes(savedView)) {
      return savedView;
    }
    if (savedUser) {
      return 'hospital-admin-dashboard';
    }
    return (savedView && savedView !== 'auth-select') ? savedView : 'landing';
  };

  const [currentView, setCurrentView] = useState(getInitialView);
  const [authModal, setAuthModal] = useState(null);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('unicare_active_user');
    if (!saved) return null;
    try {
      const user = JSON.parse(saved);
      return user?.id === 'HOSP-DEMO' ? null : user;
    } catch {
      return null;
    }
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
    setAuthModal(null);
    setCurrentUser(user);
    localStorage.setItem('unicare_active_user', JSON.stringify(user));
    // Directly navigate Hospital Admin to its dashboard after login
    setCurrentView('hospital-admin-dashboard');
    sessionStorage.setItem('unicare_current_view', 'hospital-admin-dashboard');
  };

  const handleStaffLogin = (staff) => {
    setAuthModal(null);
    setCurrentUser({ ...staff, type: 'staff' });
    setCurrentView('hospital-role-select');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveRole(null);
    localStorage.removeItem('unicare_active_user');
    sessionStorage.removeItem('unicare_current_view');
    setCurrentView('landing');
  };

  const openAuthModal = (mode) => {
    setCurrentView('landing');
    setAuthModal(mode);
  };

  const closeAuthModal = () => setAuthModal(null);

  const handleSuperAdminLoginSuccess = (adminData) => {
    setSuperAdminUser(adminData);
    localStorage.setItem('unicare_super_admin', JSON.stringify(adminData));
    setAuthModal(null);
    setCurrentView('super-admin-dashboard');
  };

  const handleSuperAdminLogout = () => {
    setSuperAdminUser(null);
    localStorage.removeItem('unicare_super_admin');
    sessionStorage.removeItem('unicare_current_view');
    setCurrentView('landing');
  };

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    if (role === 'hospital-admin') {
      setCurrentView('hospital-admin-dashboard');
    } else {
      alert(`Role selected: ${role.toUpperCase()}. Portal login for ${role} selected.`);
    }
  };

  const isSuperAdminView = currentView === 'super-admin-dashboard';
  const isIsolatedDashboard = currentView === 'hospital-role-select' || currentView === 'hospital-admin-dashboard';
  const isAuthView = currentView === 'login' || currentView === 'register';

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage setView={setCurrentView} onOpenAuth={openAuthModal} />;
      case 'auth-select':
        return <AuthSelectorPage setView={setCurrentView} />;
      case 'login':
        return <LoginPage setView={setCurrentView} onLogin={handleLogin} onStaffLogin={handleStaffLogin} onSuperAdminLogin={handleSuperAdminLoginSuccess} />;
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
        onOpenAuth={openAuthModal}
      />
      <main className="flex-grow-1">
        {renderView()}
      </main>
      {!isAuthView && <CustomFooter setView={setCurrentView} />}
      {authModal && (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-label={`${authModal} form`}>
          <button className="auth-overlay-close" type="button" onClick={closeAuthModal} aria-label="Close form">
            <i className="bi bi-x-lg"></i>
          </button>
          {authModal === 'login' ? (
            <LoginPage
              setView={(view) => view === 'register' ? setAuthModal('register') : closeAuthModal()}
              onLogin={handleLogin}
              onStaffLogin={handleStaffLogin}
              onSuperAdminLogin={handleSuperAdminLoginSuccess}
            />
          ) : (
            <RegisterPage setView={(view) => view === 'login' ? setAuthModal('login') : closeAuthModal()} />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
