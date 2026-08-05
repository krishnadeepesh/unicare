import React from 'react';

export default function AuthSelectorPage({ setView }) {
  return (
    <div className="py-5 bg-dot-grid" style={{ minHeight: 'calc(100vh - 170px)', display: 'flex', alignItems: 'center' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 text-center animate-slide-up">
            
            {/* Header */}
            <span className="badge badge-blue px-3 py-2 rounded-pill mb-3">Portal Selection</span>
            <h1 className="display-5 fw-bold mb-2">Welcome to UniCare</h1>
            <p className="text-muted mb-5 fs-6" style={{ maxWidth: '500px', margin: '0 auto' }}>
              Please select the portal that corresponds to your profile to access administrative operations or digital health services.
            </p>

            {/* Selection Grid */}
            <div className="row g-4 justify-content-center">
              
              {/* Card 1: Hospital */}
              <div className="col-md-6 col-sm-10 text-start">
                <div className="unicare-card p-4 p-lg-5 d-flex flex-column justify-content-between h-100">
                  <div>
                    <div className="icon-box mb-4" style={{ width: '64px', height: '64px', fontSize: '2rem' }}>
                      🏥
                    </div>
                    <h2 className="h3 fw-bold mb-3">Hospital Portal</h2>
                    <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                      For hospital administrators, staff, doctors, and receptionist roles to manage daily clinical workflows, staff scheduling, and operations.
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary-unicare w-100 py-3 mt-2 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => setView('hospital-flow')}
                  >
                    <span>Continue as Hospital</span>
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>

              {/* Card 2: Patient */}
              <div className="col-md-6 col-sm-10 text-start">
                <div className="unicare-card p-4 p-lg-5 d-flex flex-column justify-content-between h-100">
                  <div>
                    <div className="icon-box-teal mb-4" style={{ width: '64px', height: '64px', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      👤
                    </div>
                    <h2 className="h3 fw-bold mb-3">Patient Portal</h2>
                    <p className="text-muted mb-4" style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                      For patient accounts to view generated digital health cards, check registered appointment bookings, and access digital medical records.
                    </p>
                  </div>
                  <button 
                    className="btn btn-secondary-unicare w-100 py-3 mt-2 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => setView('patient-flow')}
                  >
                    <span>Continue as Patient</span>
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>

            </div>

            {/* Back to Home Button */}
            <div className="mt-5">
              <button 
                className="btn btn-link text-muted text-decoration-none hover-primary"
                onClick={() => setView('landing')}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Back to Home
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
