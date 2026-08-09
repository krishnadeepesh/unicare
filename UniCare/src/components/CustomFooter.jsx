import React from 'react';

export default function CustomFooter({ setView }) {
  return (
    <footer className="bg-white border-top py-5 mt-auto">
      <div className="container">
        <div className="row g-4 justify-content-between">
          {/* Logo and About Description */}
          <div className="col-lg-4 col-md-6">
            <div className="d-flex align-items-center gap-2 mb-3">
              <i className="bi bi-shield-plus text-primary fs-3"></i>
              <span className="navbar-brand-unicare fs-4">UniCare</span>
            </div>
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
              UniCare is a secure healthcare management platform helping hospitals manage their operations, patients, doctors, and medical records efficiently through a centralized system.
            </p>
            <div className="d-flex gap-3">
              <a href="#" className="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }} aria-label="Twitter">
                <i className="bi bi-twitter"></i>
              </a>
              <a href="#" className="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }} aria-label="LinkedIn">
                <i className="bi bi-linkedin"></i>
              </a>
              <a href="#" className="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }} aria-label="Facebook">
                <i className="bi bi-facebook"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-lg-2 col-md-3">
            <h5 className="mb-3" style={{ fontSize: '1rem', fontWeight: '700' }}>Platform</h5>
            <ul className="list-unstyled d-flex flex-column gap-2" style={{ fontSize: '0.9rem' }}>
              <li>
                <a href="#home" onClick={(e) => { e.preventDefault(); setView('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-muted text-decoration-none hover-primary">
                  Home
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => { e.preventDefault(); setView('landing'); setTimeout(() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="text-muted text-decoration-none hover-primary">
                  Features
                </a>
              </li>
              <li>
                <a href="#about" onClick={(e) => { e.preventDefault(); setView('landing'); setTimeout(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="text-muted text-decoration-none hover-primary">
                  About
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="col-lg-3 col-md-6" id="footer-contact">
            <h5 className="mb-3" style={{ fontSize: '1rem', fontWeight: '700' }}>Contact Us</h5>
            <ul className="list-unstyled d-flex flex-column gap-3 text-muted" style={{ fontSize: '0.9rem' }}>
              <li className="d-flex align-items-start gap-2">
                <i className="bi bi-geo-alt text-primary fs-5 mt-1"></i>
                <span>100 Healthcare Plaza, Suite 500, Tech City, TC 94016</span>
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-telephone text-primary fs-5"></i>
                <span>+1 (555) 864-2273</span>
              </li>
              <li className="d-flex align-items-center gap-2">
                <i className="bi bi-envelope text-primary fs-5"></i>
                <span>support@unicare-platform.com</span>
              </li>
            </ul>
          </div>
        </div>

        <hr className="my-4 border-light" />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3" style={{ fontSize: '0.85rem' }}>
          <div className="text-muted">
            &copy; {new Date().getFullYear()} UniCare Inc. All rights reserved.
          </div>
          <div className="d-flex gap-4 align-items-center">
            <a href="#" className="text-muted text-decoration-none hover-primary">Privacy Policy</a>
            <a href="#" className="text-muted text-decoration-none hover-primary">Terms of Service</a>
            <a 
              href="/admin" 
              onClick={(e) => { e.preventDefault(); setView('super-admin-login'); }}
              className="text-primary text-decoration-none fw-bold"
            >
              <i className="bi bi-shield-lock me-1"></i>Super Admin
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
