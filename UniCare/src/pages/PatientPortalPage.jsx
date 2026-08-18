import React, { useEffect, useState } from 'react';
import DigitalHealthCard from '../components/DigitalHealthCard';

const API = 'http://localhost:8000/api/super-admin';

export default function PatientPortalPage({ user, onLogout }) {
  const [appointments, setAppointments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    hospital_id: '',
    department_id: '',
    doctor_id: '',
    appointment_date: '',
    appointment_time: '09:00',
    reason: ''
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch(`${API}/appointments/`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments || []))
      .catch((err) => console.error("Error loading appointments:", err));

    fetch(`${API}/hospitals/?status=approved`)
      .then((r) => r.json())
      .then((d) => setHospitals(d.hospitals || []))
      .catch((err) => console.error("Error loading hospitals:", err));
  }, []);

  useEffect(() => {
    if (!form.hospital_id) return;
    fetch(`${API}/appointments/options/?hospital_id=${form.hospital_id}`)
      .then((r) => r.json())
      .then((d) => {
        setDepartments(d.departments || []);
        setDoctors(d.doctors || []);
      })
      .catch((err) => console.error("Error loading hospital booking options:", err));
  }, [form.hospital_id]);

  const book = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const r = await fetch(`${API}/appointments/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form)
      });
      const d = await r.json();
      setMessage({ text: d.message, type: r.ok ? 'success' : 'danger' });
      if (r.ok) {
        setForm({
          hospital_id: '',
          department_id: '',
          doctor_id: '',
          appointment_date: '',
          appointment_time: '09:00',
          reason: ''
        });
        const aRes = await fetch(`${API}/appointments/`, { credentials: 'include' });
        const aData = await aRes.json();
        setAppointments(aData.appointments || []);
      }
    } catch (err) {
      setMessage({ text: 'Error booking appointment.', type: 'danger' });
    }
  };

  const patientName = user?.name || user?.user_name || 'Patient';

  return (
    <div className="min-vh-100 bg-light d-flex flex-column" style={{ fontFamily: 'var(--font-body)' }}>
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg sticky-top bg-white border-bottom shadow-sm py-2 px-3">
        <div className="container-fluid max-w-7xl">
          <div className="d-flex align-items-center gap-3">
            <div
              className="rounded-3 p-2 text-white d-flex align-items-center justify-content-center shadow-sm"
              style={{ width: '42px', height: '42px', backgroundColor: '#0d9488' }}
            >
              <i className="bi bi-heart-pulse-fill fs-4"></i>
            </div>
            <div>
              <span className="navbar-brand fw-bold text-dark mb-0 py-0" style={{ fontSize: '1.15rem' }}>
                UniCare Patient Portal
              </span>
              <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                Unified Healthcare Network
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3 ms-auto">
            <div className="text-end d-none d-md-block">
              <div className="fw-semibold text-dark small">
                <i className="bi bi-person-circle text-teal me-1"></i>
                {patientName}
              </div>
              <small className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                ID: {user?.patient_uid || user?.health_id || 'N/A'}
              </small>
            </div>
            <button
              onClick={onLogout}
              className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1"
            >
              <i className="bi bi-box-arrow-right"></i> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <div className="container-fluid max-w-7xl py-4 flex-grow-1">
        {/* Banner Message */}
        {message && (
          <div className={`alert alert-${message.type} alert-dismissible fade show border-0 shadow-sm rounded-3 mb-4`} role="alert">
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill fs-5' : 'bi-exclamation-triangle-fill fs-5'}`}></i>
              <div>{message.text}</div>
            </div>
            <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="bg-white rounded-4 shadow-sm border p-4 mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <span className="badge bg-teal-subtle text-teal px-3 py-1 rounded-pill fw-medium small mb-2 d-inline-block" style={{ backgroundColor: '#e6f4f1', color: '#0d9488' }}>
                Patient Access Center
              </span>
              <h3 className="fw-bold text-dark mb-1">Welcome back, {patientName}!</h3>
              <p className="text-muted small mb-0">
                Manage your appointments, view medical profile, and schedule consultations across all partner hospitals.
              </p>
            </div>

            <div className="d-flex gap-3">
              <div className="bg-light border rounded-3 p-2 px-3 text-center">
                <span className="text-muted small d-block" style={{ fontSize: '0.75rem' }}>Total Appointments</span>
                <span className="fw-bold text-dark fs-5">{appointments.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* LEFT COLUMN: Health Card & Book Appointment Form */}
          <div className="col-lg-5 col-xl-4">
            {/* Digital Health Card */}
            <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
              <DigitalHealthCard
                patient={{
                  ...user,
                  patientId: user.patient_id || user.id,
                  healthId: user.patient_uid || user.health_id
                }}
              />
            </div>

            {/* Appointment Booking Card */}
            <div className="card border-0 shadow-sm rounded-4 mb-4">
              <div className="card-header bg-white p-3 border-bottom d-flex align-items-center gap-2">
                <i className="bi bi-calendar-plus-fill text-teal fs-5"></i>
                <h5 className="fw-bold mb-0 text-dark">Book Consultation</h5>
              </div>
              <div className="card-body p-4">
                <form onSubmit={book}>
                  {/* Select Hospital */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-secondary">Hospital *</label>
                    <select
                      className="form-select rounded-2"
                      required
                      value={form.hospital_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          hospital_id: e.target.value,
                          department_id: '',
                          doctor_id: ''
                        })
                      }
                    >
                      <option value="">-- Choose Hospital --</option>
                      {hospitals.map((h) => (
                        <option key={h.hospital_id} value={h.hospital_id}>
                          {h.hospital_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Department */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-secondary">Department *</label>
                    <select
                      className="form-select rounded-2"
                      required
                      disabled={!form.hospital_id}
                      value={form.department_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          department_id: e.target.value,
                          doctor_id: ''
                        })
                      }
                    >
                      <option value="">
                        {!form.hospital_id ? 'Select hospital first' : '-- Choose Department --'}
                      </option>
                      {departments.map((d) => (
                        <option key={d.department_id} value={d.department_id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Doctor */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-secondary">Doctor *</label>
                    <select
                      className="form-select rounded-2"
                      required
                      disabled={!form.hospital_id}
                      value={form.doctor_id}
                      onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                    >
                      <option value="">
                        {!form.hospital_id ? 'Select hospital first' : '-- Choose Doctor --'}
                      </option>
                      {doctors
                        .filter(
                          (d) =>
                            !form.department_id ||
                            String(d.department_id) === String(form.department_id)
                        )
                        .map((d) => (
                          <option key={d.doctor_id} value={d.doctor_id}>
                            {d.name} — {d.specialization}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Date & Time */}
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small text-secondary">Date *</label>
                      <input
                        type="date"
                        className="form-control rounded-2"
                        required
                        value={form.appointment_date}
                        onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small text-secondary">Time *</label>
                      <input
                        type="time"
                        className="form-control rounded-2"
                        required
                        value={form.appointment_time}
                        onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold small text-secondary">Reason *</label>
                    <input
                      type="text"
                      className="form-control rounded-2"
                      placeholder="Symptoms or reason for visit"
                      required
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn w-100 fw-bold py-2 rounded-3 text-white shadow-sm"
                    style={{ backgroundColor: '#0d9488' }}
                  >
                    <i className="bi bi-calendar-check-fill me-1"></i> Book Appointment Now
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Appointments List */}
          <div className="col-lg-7 col-xl-8">
            <div className="card border-0 shadow-sm rounded-4">
              <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-clock-history text-teal fs-5"></i>
                  <h5 className="fw-bold mb-0 text-dark">My Appointments</h5>
                </div>
                <span className="badge bg-secondary rounded-pill">{appointments.length} Appointments</span>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Date & Time</th>
                        <th>Hospital</th>
                        <th>Doctor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((a) => (
                        <tr key={a.appointment_id}>
                          <td className="ps-4 fw-semibold text-dark">
                            <div>{a.date}</div>
                            <small className="text-muted">{a.time}</small>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{a.hospital}</div>
                            <small className="text-muted">{a.department}</small>
                          </td>
                          <td>
                            <div className="fw-medium">{a.doctor}</div>
                            <small className="text-muted">{a.reason}</small>
                          </td>
                          <td>
                            <span
                              className={`badge rounded-pill px-3 py-1.5 ${
                                a.status === 'Completed'
                                  ? 'bg-success'
                                  : a.status === 'Confirmed'
                                  ? 'bg-primary'
                                  : 'bg-warning text-dark'
                              }`}
                            >
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!appointments.length && (
                        <tr>
                          <td colSpan="4" className="text-center text-muted py-5">
                            <i className="bi bi-calendar-x text-secondary d-block fs-2 mb-2"></i>
                            No appointments booked yet. Use the booking form to schedule your first consultation.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
