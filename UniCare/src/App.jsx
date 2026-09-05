import React, { useState, useEffect, useRef } from 'react';
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
import StaffDashboardPage from './pages/StaffDashboardPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import PatientPortalPage from './pages/PatientPortalPage';

function App() {
  const getInitialView = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith('/admin') || path.startsWith('/super-admin')) return 'landing';

    const savedAdmin = localStorage.getItem('unicare_super_admin');
    const savedView = sessionStorage.getItem('unicare_current_view');

    if (savedAdmin && savedView === 'super-admin-dashboard') {
      return 'super-admin-dashboard';
    }

    const savedUser = localStorage.getItem('unicare_active_user');
    let parsedUser = null;
    if (savedUser) {
      try {
        parsedUser = JSON.parse(savedUser);
        if (parsedUser?.id === 'HOSP-DEMO') {
          localStorage.removeItem('unicare_active_user');
          sessionStorage.removeItem('unicare_current_view');
          return 'landing';
        }
      } catch {
        localStorage.removeItem('unicare_active_user');
      }
    }

    // If user explicitly navigated to landing in their active session, respect landing!
    if (savedView === 'landing') {
      return 'landing';
    }

    if (savedUser && savedView && ['hospital-admin-dashboard', 'doctor-dashboard', 'receptionist-dashboard', 'patient-dashboard', 'super-admin-dashboard', 'hospital-role-select'].includes(savedView)) {
      return savedView;
    }
    if (parsedUser?.role === 'doctor') return 'doctor-dashboard';
    if (parsedUser?.role === 'receptionist') return 'receptionist-dashboard';
    if (parsedUser?.role === 'patient') return 'patient-dashboard';
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

  const effectiveUser = currentUser || (superAdminUser ? { ...superAdminUser, role: 'super-admin', name: superAdminUser.username || 'Super Admin' } : null);

  // Reference to always access current view synchronously inside popstate handler
  const currentViewRef = useRef(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  // Sync scroll & sessionStorage view state on view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    sessionStorage.setItem('unicare_current_view', currentView);
  }, [currentView]);

  const isDashboardView = (view) => {
    return [
      'doctor-dashboard',
      'receptionist-dashboard',
      'patient-dashboard',
      'hospital-admin-dashboard',
      'super-admin-dashboard',
      'hospital-role-select'
    ].includes(view);
  };

  const resolveUserDashboard = () => {
    const adminRaw = localStorage.getItem('unicare_super_admin');
    if (superAdminUser || adminRaw) return 'super-admin-dashboard';

    let user = currentUser;
    if (!user) {
      const raw = localStorage.getItem('unicare_active_user');
      if (raw) {
        try {
          user = JSON.parse(raw);
        } catch {}
      }
    }

    if (!user) return null;
    if (user.role === 'doctor') return 'doctor-dashboard';
    if (user.role === 'receptionist') return 'receptionist-dashboard';
    if (user.role === 'patient' || user.role === 'Patient') return 'patient-dashboard';
    if (user.role === 'super-admin' || user.is_superuser) return 'super-admin-dashboard';
    if (user.type === 'hospital' || user.role === 'hospital-admin' || user.role === 'Hospital Administrator') return 'hospital-admin-dashboard';
    if (user.type === 'staff') return 'hospital-role-select';
    return 'patient-dashboard';
  };

  // Safe navigation function updating view state, storage, and HTML5 browser history
  const navigateView = (newView, replace = false) => {
    if (newView === currentView) return;

    if (replace) {
      window.history.replaceState({ view: newView, isBase: newView === 'landing' }, '', window.location.pathname);
    } else {
      window.history.pushState({ view: newView, isBase: newView === 'landing' }, '', window.location.pathname);
    }

    setCurrentView(newView);
    sessionStorage.setItem('unicare_current_view', newView);
  };

  // Baseline HTML5 History initialization so Back button can toggle between dashboard & homepage
  useEffect(() => {
    const currentState = window.history.state;
    if (!currentState || !currentState.view) {
      if (currentView === 'landing') {
        window.history.replaceState({ view: 'landing', isBase: true }, '', window.location.pathname);
        window.history.pushState({ view: 'landing' }, '', window.location.pathname);
      } else {
        // Direct entry to a dashboard: ensure 'landing' is in history first, then dashboard
        window.history.replaceState({ view: 'landing', isBase: true }, '', window.location.pathname);
        window.history.pushState({ view: currentView }, '', window.location.pathname);
      }
    }
  }, []);

  // Handle browser Back navigation:
  // "If in the dashboard return to homepage. If not in dashboard and press back return to dashboard"
  useEffect(() => {
    const handlePopState = () => {
      const fromView = currentViewRef.current;
      const targetDashboard = resolveUserDashboard();

      // Rule 1: If currently IN the dashboard -> return to homepage
      if (isDashboardView(fromView)) {
        setCurrentView('landing');
        sessionStorage.setItem('unicare_current_view', 'landing');
        window.history.pushState({ view: 'landing' }, '', window.location.pathname);
        return;
      }

      // Rule 2: If NOT in dashboard and press back:
      // If user has an active session -> return to dashboard!
      if (targetDashboard) {
        setCurrentView(targetDashboard);
        sessionStorage.setItem('unicare_current_view', targetDashboard);
        window.history.pushState({ view: targetDashboard }, '', window.location.pathname);
      } else {
        // Guest user: stay safely on homepage
        setCurrentView('landing');
        sessionStorage.setItem('unicare_current_view', 'landing');
        window.history.pushState({ view: 'landing' }, '', window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, superAdminUser]);

  const handleLogin = (user) => {
    setAuthModal(null);
    setCurrentUser(user);
    localStorage.setItem('unicare_active_user', JSON.stringify(user));
    
    // Anchor landing first so Back returns to homepage in current session
    window.history.replaceState({ view: 'landing', isBase: true }, '', window.location.pathname);
    window.history.pushState({ view: 'hospital-admin-dashboard' }, '', window.location.pathname);
    
    setCurrentView('hospital-admin-dashboard');
    sessionStorage.setItem('unicare_current_view', 'hospital-admin-dashboard');
  };

  const handleStaffLogin = (staff) => {
    setAuthModal(null);
    const staffUser = { ...staff, type: 'staff' };
    setCurrentUser(staffUser);
    localStorage.setItem('unicare_active_user', JSON.stringify(staffUser));
    
    window.history.replaceState({ view: 'landing', isBase: true }, '', window.location.pathname);
    window.history.pushState({ view: 'hospital-role-select' }, '', window.location.pathname);
    
    setCurrentView('hospital-role-select');
    sessionStorage.setItem('unicare_current_view', 'hospital-role-select');
  };

  const handleRoleLogin = (user) => {
    setAuthModal(null);
    setCurrentUser(user);
    localStorage.setItem('unicare_active_user', JSON.stringify(user));
    const view = user.role === 'doctor' 
      ? 'doctor-dashboard' 
      : user.role === 'receptionist' 
      ? 'receptionist-dashboard' 
      : 'patient-dashboard';
    
    // Anchor landing first so Back returns to homepage in current session
    window.history.replaceState({ view: 'landing', isBase: true }, '', window.location.pathname);
    window.history.pushState({ view }, '', window.location.pathname);
    
    setCurrentView(view);
    sessionStorage.setItem('unicare_current_view', view);
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:8000/api/super-admin/auth/logout/', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // Ignore network errors on logout
    }
    setCurrentUser(null);
    setActiveRole(null);
    localStorage.removeItem('unicare_active_user');
    sessionStorage.removeItem('unicare_current_view');
    window.history.replaceState({ view: 'landing', isBase: true }, '', window.location.pathname);
    setCurrentView('landing');
  };

  const openAuthModal = (mode) => {
    navigateView('landing');
    setAuthModal(mode);
  };

  const closeAuthModal = () => setAuthModal(null);

  const handleSuperAdminLoginSuccess = (adminData) => {
    setSuperAdminUser(adminData);
    localStorage.setItem('unicare_super_admin', JSON.stringify(adminData));
    setAuthModal(null);
    
    window.history.replaceState({ view: 'landing', isBase: true }, '', window.location.pathname);
    window.history.pushState({ view: 'super-admin-dashboard' }, '', window.location.pathname);
    
    setCurrentView('super-admin-dashboard');
    sessionStorage.setItem('unicare_current_view', 'super-admin-dashboard');
  };

  const handleSuperAdminLogout = async () => {
    try {
      await fetch('http://localhost:8000/api/super-admin/logout/', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // Ignore network errors on logout
    }
    setSuperAdminUser(null);
    localStorage.removeItem('unicare_super_admin');
    sessionStorage.removeItem('unicare_current_view');
    window.history.replaceState({ view: 'landing', isBase: true }, '', window.location.pathname);
    setCurrentView('landing');
  };

  const handleRoleSelect = (role) => {
    setActiveRole(role);
    if (role === 'hospital-admin') {
      navigateView('hospital-admin-dashboard');
    } else {
      alert(`Role selected: ${role.toUpperCase()}. Portal login for ${role} selected.`);
    }
  };

  const isSuperAdminView = currentView === 'super-admin-dashboard';
  const isIsolatedDashboard = ['hospital-role-select', 'hospital-admin-dashboard', 'doctor-dashboard', 'receptionist-dashboard', 'patient-dashboard'].includes(currentView);
  const isAuthView = currentView === 'login' || currentView === 'register';

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage setView={navigateView} onOpenAuth={openAuthModal} currentUser={effectiveUser} />;
      case 'auth-select':
        return <AuthSelectorPage setView={navigateView} />;
      case 'login':
        return <LoginPage setView={navigateView} onLogin={handleLogin} onStaffLogin={handleStaffLogin} onSuperAdminLogin={handleSuperAdminLoginSuccess} onRoleLogin={handleRoleLogin} />;
      case 'register':
        return <RegisterPage setView={navigateView} />;
      case 'hospital-flow':
        return <HospitalFlowPage setView={navigateView} onLogin={handleLogin} />;
      case 'patient-flow':
        return <PatientFlowPage setView={navigateView} onLogin={handleLogin} />;
      case 'hospital-role-select':
        return (
          <HospitalRoleSelectorPage 
            hospitalInfo={currentUser}
            onSelectRole={handleRoleSelect}
            onLogout={handleLogout}
            onNavigateHome={() => navigateView('landing')}
          />
        );
      case 'hospital-admin-dashboard':
        return (
          <HospitalAdminDashboardPage 
            hospitalInfo={currentUser}
            onBackToRoleSelect={() => navigateView('hospital-role-select')}
            onLogout={handleLogout}
            onNavigateHome={() => navigateView('landing')}
          />
        );
      case 'super-admin-dashboard':
        return (
          <SuperAdminDashboardPage 
            adminUser={superAdminUser} 
            onLogout={handleSuperAdminLogout} 
            onNavigateHome={() => navigateView('landing')}
          />
        );
      case 'doctor-dashboard':
        return <DoctorDashboardPage user={currentUser} onLogout={handleLogout} onNavigateHome={() => navigateView('landing')} />;
      case 'receptionist-dashboard':
        return <StaffDashboardPage user={currentUser} onLogout={handleLogout} onNavigateHome={() => navigateView('landing')} />;
      case 'patient-dashboard':
        return <PatientPortalPage user={currentUser} onLogout={handleLogout} onNavigateHome={() => navigateView('landing')} />;
      default:
        return <LandingPage setView={navigateView} onOpenAuth={openAuthModal} currentUser={effectiveUser} />;
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
        setView={navigateView} 
        currentUser={effectiveUser}
        onLogout={superAdminUser ? handleSuperAdminLogout : handleLogout}
        onOpenAuth={openAuthModal}
      />
      <main className="flex-grow-1">
        {renderView()}
      </main>
      {!isAuthView && <CustomFooter setView={navigateView} />}
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
              onRoleLogin={handleRoleLogin}
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
