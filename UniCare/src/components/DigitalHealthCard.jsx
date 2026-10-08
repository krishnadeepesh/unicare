import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { calculateAge } from '../utils/dateUtils';

export default function DigitalHealthCard({ patient }) {
  const cardRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  const patientUpid = patient?.healthId || patient?.patient_uid || patient?.patientId || 'PTA001';
  const patientName = patient?.name || patient?.fullName || 'Demo Patient';
  const patientDob = patient?.dob || patient?.dateOfBirth || patient?.date_of_birth || '01/01/1990';
  const patientBlood = patient?.bloodGroup || patient?.blood_group || 'O+';
  const patientPhone = patient?.phone || patient?.phoneNumber || 'N/A';

  // Generate dynamic QR code encoding patient's official UPID & essential verification details
  useEffect(() => {
    if (!patient) return;

    // Structured JSON payload + human-readable header so any standard QR scanner reads it instantly
    const qrPayload = JSON.stringify({
      platform: 'UniCare Interoperable EHR',
      upid: patientUpid,
      name: patientName,
      dob: patientDob,
      blood_group: patientBlood,
      contact: patientPhone,
      verification_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/portal?health_id=${patientUpid}`
    }, null, 2);

    QRCode.toDataURL(qrPayload, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code:', err));
  }, [patientUpid, patientName, patientDob, patientBlood, patientPhone]);

  if (!patient) return null;

  // Handler to trigger print of ONLY the health card
  const handlePrint = (e) => {
    e.preventDefault();
    if (!cardRef.current) {
      window.print();
      return;
    }

    // Create an isolated hidden iframe for printing ONLY the health card
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;

    // Collect all active stylesheets and styles so the card looks identical
    let stylesHtml = '';
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      stylesHtml += node.outerHTML;
    });

    const cardHtml = cardRef.current.outerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>UniCare Digital Health Card - ${patientName}</title>
          ${stylesHtml}
          <style>
            @page {
              size: auto;
              margin: 15mm;
            }
            body {
              margin: 0;
              padding: 24px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background-color: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .health-card {
              box-shadow: none !important;
              margin: 0 auto !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body>
          ${cardHtml}
        </body>
      </html>
    `);
    doc.close();

    // Focus and print only the iframe content
    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1500);
    }, 350);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `UniCare_HealthCard_QR_${patientUpid}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="d-flex flex-column align-items-center gap-3">
      <div 
        ref={cardRef}
        id="health-card-printable"
        className="health-card animate-fade-in text-start position-relative"
      >
        {/* Top Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-shield-plus text-info fs-3"></i>
            <span className="health-card-logo fs-5">UniCare</span>
          </div>
          <span className="badge bg-teal px-2.5 py-1 text-white border border-teal-500 rounded-pill" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>
            DIGITAL HEALTH
          </span>
        </div>

        {/* Chip & NFC symbol */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="health-card-chip"></div>
          <i className="bi bi-wifi text-light fs-4" style={{ transform: 'rotate(90deg)', opacity: 0.6 }}></i>
        </div>

        {/* Card Number / Patient ID */}
        <div className="mb-4">
          <div className="text-light opacity-50 fs-8 text-uppercase mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>
            Global Health Identification ID
          </div>
          <div className="fs-4 fw-bold tracking-widest text-white font-monospace" style={{ letterSpacing: '2px' }}>
            {patientUpid}
          </div>
        </div>

        {/* Patient Name and Info Grid */}
        <div className="row g-3 mb-4">
          <div className="col-8">
            <div className="text-light opacity-50 fs-8 text-uppercase mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>
              Cardholder Name
            </div>
            <div className="fw-bold text-white text-truncate" style={{ fontSize: '1.1rem' }}>
              {patientName}
            </div>
          </div>
          <div className="col-4 text-end">
            <div className="text-light opacity-50 fs-8 text-uppercase mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>
              Blood Type
            </div>
            <div className="fw-bold text-info" style={{ fontSize: '1.1rem' }}>
              {patientBlood}
            </div>
          </div>
        </div>

        {/* Footer Details: DOB and Phone */}
        <div className="row g-3 mb-3">
          <div className="col-6">
            <div className="text-light opacity-50 fs-8 text-uppercase mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>
              Date of Birth
            </div>
            <div className="fw-semibold text-white-50" style={{ fontSize: '0.9rem' }}>
              {patientDob}
              {calculateAge(patientDob) !== '' && (
                <span className="badge bg-white bg-opacity-25 text-white ms-2" style={{ fontSize: '0.725rem' }}>
                  Age: {calculateAge(patientDob)}
                </span>
              )}
            </div>
          </div>
          <div className="col-6 text-end">
            <div className="text-light opacity-50 fs-8 text-uppercase mb-1" style={{ fontSize: '10px', letterSpacing: '1px' }}>
              Contact
            </div>
            <div className="fw-semibold text-white-50" style={{ fontSize: '0.9rem' }}>
              {patientPhone}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Barcode on Left, Dynamic QR Code on Right */}
        <div className="pt-2 border-top border-secondary border-opacity-25 d-flex align-items-center justify-content-between gap-3">
          <div className="flex-grow-1">
            <div className="health-card-barcode mb-1"></div>
            <div className="text-white-50 font-monospace extra-small" style={{ fontSize: '9px', letterSpacing: '2px' }}>
              *{patientUpid}*
            </div>
          </div>

          {/* Dynamic Scannable QR Code */}
          {qrDataUrl && (
            <div 
              className="bg-white p-1 rounded-2 shadow-sm flex-shrink-0 cursor-pointer d-flex flex-column align-items-center"
              style={{ width: '68px', cursor: 'pointer' }}
              onClick={() => setShowQrModal(true)}
              title="Click to enlarge Dynamic QR Code"
            >
              <img 
                src={qrDataUrl} 
                alt="Health Card QR" 
                style={{ width: '60px', height: '60px', display: 'block' }} 
              />
              <span className="text-dark fw-bold" style={{ fontSize: '7px', letterSpacing: '0.5px' }}>
                SCAN QR
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action triggers */}
      <div className="d-flex align-items-center gap-2 no-print flex-wrap justify-content-center">
        <button 
          type="button"
          className="btn btn-outline-teal btn-sm d-flex align-items-center gap-2 px-3 py-1.5" 
          onClick={handlePrint}
          style={{ borderRadius: '8px', color: '#0d9488', borderColor: '#0d9488' }}
        >
          <i className="bi bi-printer"></i>
          <span className="fw-semibold">Print Health Card</span>
        </button>

        <button 
          type="button"
          className="btn btn-light btn-sm border d-flex align-items-center gap-2 px-3 py-1.5 text-secondary shadow-sm"
          onClick={() => setShowQrModal(true)}
          style={{ borderRadius: '8px' }}
        >
          <i className="bi bi-qr-code-scan text-teal" style={{ color: '#0d9488' }}></i>
          <span className="fw-semibold">Scan / Enlarge QR</span>
        </button>
      </div>

      {/* Modal to view enlarged QR Code */}
      {showQrModal && (
        <div className="modal show d-block bg-dark bg-opacity-75 z-5 no-print" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '380px' }}>
            <div className="modal-content rounded-4 border-0 shadow-lg text-center p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="modal-title fw-bold text-dark fs-6 mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-qr-code text-teal" style={{ color: '#0d9488' }}></i>
                  Dynamic Health QR Code
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowQrModal(false)}></button>
              </div>

              <p className="text-muted small mb-3">
                Scan with any smartphone or hospital clinical scanner to instantly retrieve <strong>{patientName}</strong>'s Unified Patient Record.
              </p>

              {qrDataUrl && (
                <div className="p-3 bg-light rounded-3 d-inline-block border mx-auto mb-3">
                  <img 
                    src={qrDataUrl} 
                    alt="Enlarged Health QR" 
                    className="img-fluid rounded" 
                    style={{ width: '200px', height: '200px' }} 
                  />
                </div>
              )}

              <div className="badge bg-teal-subtle text-teal border border-teal-subtle py-1.5 px-3 rounded-pill font-monospace mb-3" style={{ color: '#0d9488' }}>
                UPID: <strong>{patientUpid}</strong>
              </div>

              <div className="d-flex gap-2 justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-outline-teal btn-sm rounded-pill px-3"
                  onClick={handleDownloadQr}
                  style={{ color: '#0d9488', borderColor: '#0d9488' }}
                >
                  <i className="bi bi-download me-1"></i> Save Image
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm rounded-pill px-3"
                  onClick={() => setShowQrModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
