import React from 'react';

export default function LandingPage({ setView }) {
  const features = [
    {
      title: 'Hospital Management',
      icon: 'bi-hospital',
      description: 'Manage hospitals, departments, doctors, receptionists, and daily operations from a single dashboard.',
      color: 'primary'
    },
    {
      title: 'Patient Management',
      icon: 'bi-people',
      description: 'Maintain detailed digital patient records, generated medical profiles, and unique patient identification keys.',
      color: 'teal'
    },
    {
      title: 'Medical Records',
      icon: 'bi-file-earmark-medical',
      description: 'Store and manage patient medical history, lab results, and prescriptions securely under strict encryption.',
      color: 'primary'
    },
    {
      title: 'Appointment Management',
      icon: 'bi-calendar-check',
      description: 'Schedule, reschedule, and manage hospital appointments and staff shifts easily through an automated scheduler.',
      color: 'teal'
    },
    {
      title: 'Secure Healthcare',
      icon: 'bi-shield-lock',
      description: 'Maintain patient privacy, data integrity, and secure role-based access control for administrative and clinical staff.',
      color: 'primary'
    }
  ];

  const steps = [
    {
      num: '1',
      title: 'Hospital Registration',
      description: 'Submit your hospital registration details and administrative credentials through our secure enrollment form.'
    },
    {
      num: '2',
      title: 'Hospital Approval',
      description: 'UniCare administrators review the submissions to verify credentials and authorize portal credentials.'
    },
    {
      num: '3',
      title: 'Hospital Management',
      description: 'Deploy role-specific portal logins for doctors, administrators, and receptionists to configure operations.'
    },
    {
      num: '4',
      title: 'Secure Healthcare Services',
      description: 'Register patients, schedule appointments, record clinical diagnostics, and provide premium digital healthcare cards.'
    }
  ];

  return (
    <div className="bg-dot-grid">
      {/* Hero Section */}
      <section className="py-5 py-lg-6 my-lg-4" id="home">
        <div className="container">
          <div className="row align-items-center g-5">
            {/* Left Content */}
            <div className="col-lg-6 animate-slide-up text-center text-lg-start">
              <span className="badge badge-blue px-3 py-2 rounded-pill mb-3">
                <i className="bi bi-stars me-1 text-primary"></i> Next-Gen Healthcare Platform
              </span>
              <h1 className="display-4 fw-extrabold mb-3 text-slate-900" style={{ letterSpacing: '-1px', lineHeight: '1.15' }}>
                Unified Healthcare Management for <span className="text-primary">Connected Hospitals</span>
              </h1>
              <p className="lead text-muted mb-4" style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                UniCare is a secure healthcare management platform that helps hospitals manage their operations, patients, doctors, and medical records efficiently through a centralized system.
              </p>
              <div className="d-flex flex-column flex-sm-row justify-content-center justify-content-lg-start gap-3">
                <button 
                  className="btn btn-primary-unicare px-4 py-3 fs-6 d-flex align-items-center justify-content-center gap-2"
                  onClick={() => setView('register')}
                >
                  <span>Get Started Now</span>
                  <i className="bi bi-arrow-right"></i>
                </button>
                <a 
                  href="#features" 
                  className="btn btn-outline-unicare px-4 py-3 fs-6 d-flex align-items-center justify-content-center gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <span>Explore Features</span>
                </a>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="col-lg-6 animate-fade-in">
              <div className="healthcare-illustration-container">
                <img 
                  src="/hero-illustration.png" 
                  alt="UniCare Healthcare Management Illustration" 
                  className="illustration-img img-fluid animate-float"
                  style={{ width: '85%', filter: 'drop-shadow(0 25px 35px rgba(37,99,235,0.08))' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-5 border-top bg-white" id="features">
        <div className="container py-lg-4">
          <div className="text-center max-w-2xl mx-auto mb-5">
            <span className="badge badge-teal px-3 py-2 rounded-pill mb-2">Features</span>
            <h2 className="display-6 fw-bold">Comprehensive Tools for Healthcare Teams</h2>
            <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
              UniCare offers a unified workflow with specialized systems tailored to ensure clinical efficiency and secure record compliance.
            </p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* Displaying first 3 features */}
            {features.slice(0, 3).map((feat, idx) => (
              <div className="col-lg-4 col-md-6" key={idx}>
                <div className="unicare-card">
                  <div className={feat.color === 'primary' ? 'icon-box' : 'icon-box-teal'}>
                    <i className={`bi ${feat.icon}`}></i>
                  </div>
                  <h3 className="h4 fw-bold mb-3">{feat.title}</h3>
                  <p className="text-muted mb-0" style={{ fontSize: '0.925rem', lineHeight: '1.6' }}>
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}

            {/* Displaying next 2 features centered */}
            {features.slice(3).map((feat, idx) => (
              <div className="col-lg-4 col-md-6" key={idx + 3}>
                <div className="unicare-card">
                  <div className={feat.color === 'primary' ? 'icon-box' : 'icon-box-teal'}>
                    <i className={`bi ${feat.icon}`}></i>
                  </div>
                  <h3 className="h4 fw-bold mb-3">{feat.title}</h3>
                  <p className="text-muted mb-0" style={{ fontSize: '0.925rem', lineHeight: '1.6' }}>
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How UniCare Works Section */}
      <section className="py-5 border-top bg-light" id="about">
        <div className="container py-lg-4">
          <div className="text-center mb-5">
            <span className="badge badge-blue px-3 py-2 rounded-pill mb-2">Workflow</span>
            <h2 className="display-6 fw-bold">How UniCare Works</h2>
            <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
              Enrolling your hospital and patient registry is quick, secure, and fully guided.
            </p>
          </div>

          <div className="row g-4">
            {steps.map((step, idx) => (
              <div className="col-lg-3 col-md-6" key={idx}>
                <div className="p-4 bg-white border rounded shadow-sm text-center h-100 position-relative">
                  <div className="d-flex justify-content-center">
                    <div className="step-circle">{step.num}</div>
                  </div>
                  <h3 className="h5 fw-bold mb-2">{step.title}</h3>
                  <p className="text-muted mb-0" style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                    {step.description}
                  </p>
                  {idx < steps.length - 1 && (
                    <div className="d-none d-lg-block position-absolute" style={{ top: '48px', right: '-15%', width: '30%', height: '2px', borderTop: '2px dashed var(--border-light)', zIndex: 1 }}></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-5 border-top bg-white" id="contact">
        <div className="container py-lg-4">
          <div className="row g-5 align-items-center">
            {/* Contact Details info */}
            <div className="col-lg-6">
              <span className="badge badge-teal px-3 py-2 rounded-pill mb-2">Get in Touch</span>
              <h2 className="display-6 fw-bold mb-4">We'd love to hear from you</h2>
              <p className="text-muted mb-4" style={{ lineHeight: '1.6' }}>
                Have questions about hospital integrations, regulatory compliance, pricing, or custom deployment? Fill out the form and our medical software solutions experts will get back to you shortly.
              </p>
              
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px' }}>
                    <i className="bi bi-telephone-fill"></i>
                  </div>
                  <div>
                    <div className="fw-semibold">Direct Inquiry</div>
                    <div className="text-muted">+1 (555) 864-2273</div>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <div className="bg-teal text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px', backgroundColor: 'var(--secondary-color) !important' }}>
                    <i className="bi bi-envelope-fill"></i>
                  </div>
                  <div>
                    <div className="fw-semibold">Email Support</div>
                    <div className="text-muted">support@unicare-platform.com</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simple Contact Form */}
            <div className="col-lg-6">
              <div className="p-4 p-md-5 bg-light border rounded shadow-sm">
                <h3 className="h4 fw-bold mb-4">Send a Message</h3>
                <form onSubmit={(e) => { e.preventDefault(); alert('Thank you! Your message has been sent successfully (Demo Mode).'); e.target.reset(); }}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Full Name</label>
                      <input type="text" className="form-control" placeholder="Jane Doe" required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email Address</label>
                      <input type="email" className="form-control" placeholder="jane@example.com" required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Hospital/Company Name</label>
                      <input type="text" className="form-control" placeholder="City General Hospital" />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Message</label>
                      <textarea className="form-control" rows="4" placeholder="How can we assist you?" required></textarea>
                    </div>
                    <div className="col-12">
                      <button type="submit" className="btn btn-primary-unicare w-100">Send Message</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-6 bg-primary text-white position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #1e3a8a 100%)' }}>
        <div className="container py-lg-4 text-center position-relative" style={{ zIndex: 2 }}>
          <h2 className="display-5 fw-extrabold mb-3 text-white">Manage Healthcare Smarter with UniCare</h2>
          <p className="lead text-white-50 max-w-2xl mx-auto mb-4" style={{ fontSize: '1.15rem' }}>
            Bring connectivity, speed, and safety to your healthcare staff and patient coordination today.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <button 
              className="btn btn-light px-4 py-3 fw-bold text-primary shadow" 
              onClick={() => setView('register')}
              style={{ borderRadius: '8px' }}
            >
              Get Started Now
            </button>
            <button 
              className="btn btn-outline-light px-4 py-3 fw-bold" 
              onClick={() => {
                document.getElementById('footer-contact')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{ borderRadius: '8px' }}
            >
              Contact Sales
            </button>
          </div>
        </div>
        {/* Subtle grid elements */}
        <div className="position-absolute w-100 h-100 top-0 left-0 bg-dot-grid" style={{ opacity: 0.15 }}></div>
      </section>
    </div>
  );
}
