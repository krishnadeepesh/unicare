import os
from pathlib import Path

svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1480 1120" width="100%" height="100%" style="background-color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif;">
  <defs>
    <!-- Arrow marker for associations -->
    <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#333333" />
    </marker>
    <!-- Arrow marker for include / extend -->
    <marker id="dashed-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#444444" />
    </marker>
    <style>
      .actor-text { font-size: 15px; font-weight: bold; fill: #111827; text-anchor: middle; }
      .usecase-text { font-size: 13px; font-weight: 500; fill: #1f2937; text-anchor: middle; dominant-baseline: middle; }
      .rel-text { font-size: 11px; font-style: italic; fill: #4b5563; text-anchor: middle; background: #ffffff; }
      .system-title { font-size: 18px; font-weight: bold; fill: #111827; letter-spacing: 0.5px; }
      .usecase-ellipse { fill: #fcfcfd; stroke: #1f2937; stroke-width: 1.8; }
      .association-line { stroke: #374151; stroke-width: 1.3; fill: none; }
      .dependency-line { stroke: #4b5563; stroke-width: 1.4; stroke-dasharray: 5,4; fill: none; marker-end: url(#dashed-arrow); }
      .actor-line { stroke: #111827; stroke-width: 2; stroke-linecap: round; }
      .system-box { fill: #ffffff; stroke: #111827; stroke-width: 2.2; }
    </style>
  </defs>

  <!-- ================= SYSTEM BOUNDARY ================= -->
  <rect x="220" y="30" width="1020" height="1060" rx="8" class="system-box" />
  <text x="730" y="65" text-anchor="middle" class="system-title">UniCare Healthcare Management System</text>

  <!-- ================= STICK FIGURE MACROS ================= -->
  <!-- Helper function representation for stick figures:
       Head (cx, cy, r=14), Body (cy+14 to cy+48), Arms (cy+25), Legs (cy+48 to cy+78) -->

  <!-- ACTOR 1: Patient (Left Top) -->
  <g id="actor-patient" transform="translate(100, 150)">
    <circle cx="0" cy="0" r="14" class="actor-line" fill="#ffffff" />
    <line x1="0" y1="14" x2="0" y2="48" class="actor-line" />
    <line x1="-22" y1="26" x2="22" y2="26" class="actor-line" />
    <line x1="0" y1="48" x2="-18" y2="80" class="actor-line" />
    <line x1="0" y1="48" x2="18" y2="80" class="actor-line" />
    <text x="0" y="102" class="actor-text">Patient</text>
  </g>

  <!-- ACTOR 2: Nurse (Left Middle) -->
  <g id="actor-nurse" transform="translate(100, 480)">
    <circle cx="0" cy="0" r="14" class="actor-line" fill="#ffffff" />
    <line x1="0" y1="14" x2="0" y2="48" class="actor-line" />
    <line x1="-22" y1="26" x2="22" y2="26" class="actor-line" />
    <line x1="0" y1="48" x2="-18" y2="80" class="actor-line" />
    <line x1="0" y1="48" x2="18" y2="80" class="actor-line" />
    <text x="0" y="102" class="actor-text">Nurse</text>
  </g>

  <!-- ACTOR 3: Doctor (Left Bottom) -->
  <g id="actor-doctor" transform="translate(100, 820)">
    <circle cx="0" cy="0" r="14" class="actor-line" fill="#ffffff" />
    <line x1="0" y1="14" x2="0" y2="48" class="actor-line" />
    <line x1="-22" y1="26" x2="22" y2="26" class="actor-line" />
    <line x1="0" y1="48" x2="-18" y2="80" class="actor-line" />
    <line x1="0" y1="48" x2="18" y2="80" class="actor-line" />
    <text x="0" y="102" class="actor-text">Doctor</text>
  </g>

  <!-- ACTOR 4: Hospital Admin (Right Top) -->
  <g id="actor-hospital-admin" transform="translate(1360, 310)">
    <circle cx="0" cy="0" r="14" class="actor-line" fill="#ffffff" />
    <line x1="0" y1="14" x2="0" y2="48" class="actor-line" />
    <line x1="-22" y1="26" x2="22" y2="26" class="actor-line" />
    <line x1="0" y1="48" x2="-18" y2="80" class="actor-line" />
    <line x1="0" y1="48" x2="18" y2="80" class="actor-line" />
    <text x="0" y="102" class="actor-text">Hospital Admin</text>
  </g>

  <!-- ACTOR 5: Super Admin (Right Bottom) -->
  <g id="actor-super-admin" transform="translate(1360, 770)">
    <circle cx="0" cy="0" r="14" class="actor-line" fill="#ffffff" />
    <line x1="0" y1="14" x2="0" y2="48" class="actor-line" />
    <line x1="-22" y1="26" x2="22" y2="26" class="actor-line" />
    <line x1="0" y1="48" x2="-18" y2="80" class="actor-line" />
    <line x1="0" y1="48" x2="18" y2="80" class="actor-line" />
    <text x="0" y="102" class="actor-text">Super Admin</text>
  </g>


  <!-- ================= USE CASES (OVALS) ================= -->

  <!-- AUTHENTICATION CLUSTER (Central) -->
  <g id="uc-login">
    <ellipse cx="730" cy="140" rx="90" ry="24" class="usecase-ellipse" />
    <text x="730" y="140" class="usecase-text">Login / Authentication</text>
  </g>

  <g id="uc-verify-pw">
    <ellipse cx="730" cy="235" rx="95" ry="24" class="usecase-ellipse" />
    <text x="730" y="235" class="usecase-text">Verify Role &amp; Password</text>
  </g>

  <g id="uc-reset-pw">
    <ellipse cx="730" cy="330" rx="95" ry="24" class="usecase-ellipse" />
    <text x="730" y="330" class="usecase-text">Security Question Recovery</text>
  </g>

  <!-- PATIENT USE CASES (Left-Top Column) -->
  <g id="uc-health-card">
    <ellipse cx="420" cy="115" rx="115" ry="24" class="usecase-ellipse" />
    <text x="420" y="115" class="usecase-text">View Digital Health Card &amp; QR</text>
  </g>

  <g id="uc-book-apt">
    <ellipse cx="420" cy="180" rx="100" ry="24" class="usecase-ellipse" />
    <text x="420" y="180" class="usecase-text">Book &amp; View Appointments</text>
  </g>

  <g id="uc-view-presc">
    <ellipse cx="420" cy="245" rx="105" ry="24" class="usecase-ellipse" />
    <text x="420" y="245" class="usecase-text">Access Digital Prescriptions</text>
  </g>

  <g id="uc-shared-records">
    <ellipse cx="420" cy="310" rx="115" ry="24" class="usecase-ellipse" />
    <text x="420" y="310" class="usecase-text">View Shared Medical History</text>
  </g>

  <!-- NURSE USE CASES (Left-Middle Column) -->
  <g id="uc-record-vitals">
    <ellipse cx="420" cy="425" rx="115" ry="24" class="usecase-ellipse" />
    <text x="420" y="425" class="usecase-text">Record Vitals &amp; Calculate BMI</text>
  </g>

  <g id="uc-nurse-op">
    <ellipse cx="420" cy="490" rx="105" ry="24" class="usecase-ellipse" />
    <text x="420" y="490" class="usecase-text">Outpatient Records (OP)</text>
  </g>

  <g id="uc-nurse-ip">
    <ellipse cx="420" cy="555" rx="110" ry="24" class="usecase-ellipse" />
    <text x="420" y="555" class="usecase-text">Inpatient Records &amp; Bed Track</text>
  </g>

  <g id="uc-patient-history">
    <ellipse cx="420" cy="620" rx="115" ry="24" class="usecase-ellipse" />
    <text x="420" y="620" class="usecase-text">Date-wise Patient History</text>
  </g>

  <g id="uc-nurse-lab">
    <ellipse cx="420" cy="685" rx="115" ry="24" class="usecase-ellipse" />
    <text x="420" y="685" class="usecase-text">Upload / View Lab Reports</text>
  </g>

  <!-- DOCTOR USE CASES (Left-Bottom & Center Column) -->
  <g id="uc-patient-lookup">
    <ellipse cx="420" cy="790" rx="115" ry="24" class="usecase-ellipse" />
    <text x="420" y="790" class="usecase-text">Search Patient by UPID</text>
  </g>

  <g id="uc-doctor-consult">
    <ellipse cx="420" cy="860" rx="115" ry="25" class="usecase-ellipse" />
    <text x="420" y="860" class="usecase-text">Conduct Clinical Consultation</text>
  </g>

  <g id="uc-ip-op-select">
    <ellipse cx="730" cy="800" rx="115" ry="24" class="usecase-ellipse" />
    <text x="730" y="800" class="usecase-text">Select Visit Type (IP / OP)</text>
  </g>

  <g id="uc-prescription">
    <ellipse cx="730" cy="875" rx="120" ry="25" class="usecase-ellipse" />
    <text x="730" y="875" class="usecase-text">Issue Digital Rx (Autocomplete)</text>
  </g>

  <g id="uc-rounds-discharge">
    <ellipse cx="730" cy="955" rx="115" ry="24" class="usecase-ellipse" />
    <text x="730" y="955" class="usecase-text">Inpatient Rounds &amp; Discharge</text>
  </g>

  <g id="uc-lab-toggle">
    <ellipse cx="420" cy="940" rx="115" ry="24" class="usecase-ellipse" />
    <text x="420" y="940" class="usecase-text">Toggle Share / Keep Local</text>
  </g>

  <!-- HOSPITAL ADMIN USE CASES (Right-Top Column) -->
  <g id="uc-hosp-dept">
    <ellipse cx="1040" cy="200" rx="100" ry="24" class="usecase-ellipse" />
    <text x="1040" y="200" class="usecase-text">Manage Departments</text>
  </g>

  <g id="uc-hosp-staff">
    <ellipse cx="1040" cy="270" rx="110" ry="24" class="usecase-ellipse" />
    <text x="1040" y="270" class="usecase-text">Onboard Doctors &amp; Nurses</text>
  </g>

  <g id="uc-hosp-creds">
    <ellipse cx="1040" cy="340" rx="115" ry="24" class="usecase-ellipse" />
    <text x="1040" y="340" class="usecase-text">Generate Staff Credentials</text>
  </g>

  <g id="uc-hosp-license">
    <ellipse cx="1040" cy="410" rx="115" ry="24" class="usecase-ellipse" />
    <text x="1040" y="410" class="usecase-text">Upload License &amp; Reg Status</text>
  </g>

  <g id="uc-hosp-network-req">
    <ellipse cx="1040" cy="480" rx="115" ry="24" class="usecase-ellipse" />
    <text x="1040" y="480" class="usecase-text">Request Network Participation</text>
  </g>

  <!-- SUPER ADMIN USE CASES (Right-Bottom Column) -->
  <g id="uc-sa-approve">
    <ellipse cx="1040" cy="670" rx="115" ry="24" class="usecase-ellipse" />
    <text x="1040" y="670" class="usecase-text">Verify &amp; Approve Hospitals</text>
  </g>

  <g id="uc-sa-network">
    <ellipse cx="1040" cy="740" rx="115" ry="24" class="usecase-ellipse" />
    <text x="1040" y="740" class="usecase-text">Hospital Network Management</text>
  </g>

  <g id="uc-sa-audit">
    <ellipse cx="1040" cy="810" rx="105" ry="24" class="usecase-ellipse" />
    <text x="1040" y="810" class="usecase-text">View System Audit Logs</text>
  </g>

  <g id="uc-sa-analytics">
    <ellipse cx="1040" cy="880" rx="110" ry="24" class="usecase-ellipse" />
    <text x="1040" y="880" class="usecase-text">Platform Analytics &amp; Stats</text>
  </g>


  <!-- ================= ASSOCIATIONS (LINES) ================= -->

  <!-- PATIENT LINES -->
  <line x1="125" y1="170" x2="305" y2="120" class="association-line" />
  <line x1="125" y1="175" x2="320" y2="180" class="association-line" />
  <line x1="125" y1="185" x2="315" y2="245" class="association-line" />
  <line x1="125" y1="195" x2="305" y2="310" class="association-line" />
  <line x1="125" y1="160" x2="640" y2="140" class="association-line" />

  <!-- NURSE LINES -->
  <line x1="125" y1="500" x2="305" y2="430" class="association-line" />
  <line x1="125" y1="510" x2="315" y2="490" class="association-line" />
  <line x1="125" y1="520" x2="310" y2="555" class="association-line" />
  <line x1="125" y1="530" x2="305" y2="620" class="association-line" />
  <line x1="125" y1="540" x2="305" y2="685" class="association-line" />
  <line x1="125" y1="490" x2="645" y2="150" class="association-line" />

  <!-- DOCTOR LINES -->
  <line x1="125" y1="840" x2="305" y2="790" class="association-line" />
  <line x1="125" y1="850" x2="305" y2="860" class="association-line" />
  <line x1="125" y1="865" x2="305" y2="940" class="association-line" />
  <line x1="125" y1="830" x2="650" y2="160" class="association-line" />

  <!-- HOSPITAL ADMIN LINES -->
  <line x1="1335" y1="330" x2="1140" y2="205" class="association-line" />
  <line x1="1335" y1="340" x2="1150" y2="270" class="association-line" />
  <line x1="1335" y1="350" x2="1155" y2="340" class="association-line" />
  <line x1="1335" y1="360" x2="1155" y2="410" class="association-line" />
  <line x1="1335" y1="370" x2="1155" y2="480" class="association-line" />
  <line x1="1335" y1="320" x2="820" y2="145" class="association-line" />

  <!-- SUPER ADMIN LINES -->
  <line x1="1335" y1="790" x2="1155" y2="675" class="association-line" />
  <line x1="1335" y1="800" x2="1155" y2="740" class="association-line" />
  <line x1="1335" y1="810" x2="1145" y2="810" class="association-line" />
  <line x1="1335" y1="820" x2="1150" y2="880" class="association-line" />
  <line x1="1335" y1="780" x2="815" y2="155" class="association-line" />


  <!-- ================= INCLUDES & EXTENDS (DASHED ARROWS) ================= -->

  <!-- Login <<include>> Verify Password -->
  <line x1="730" y1="164" x2="730" y2="208" class="dependency-line" />
  <text x="772" y="190" class="rel-text">&lt;&lt;include&gt;&gt;</text>

  <!-- Login <<extend>> Reset Password -->
  <line x1="730" y1="306" x2="730" y2="262" class="dependency-line" />
  <text x="772" y="288" class="rel-text">&lt;&lt;extend&gt;&gt;</text>

  <!-- Consultation <<include>> Patient Lookup -->
  <line x1="420" y1="835" x2="420" y2="817" class="dependency-line" />
  <text x="468" y="830" class="rel-text">&lt;&lt;include&gt;&gt;</text>

  <!-- Consultation <<include>> Select Visit Type (IP/OP) -->
  <line x1="530" y1="850" x2="620" y2="815" class="dependency-line" />
  <text x="590" y="845" class="rel-text">&lt;&lt;include&gt;&gt;</text>

  <!-- Consultation <<include>> Issue Digital Rx -->
  <line x1="535" y1="867" x2="610" y2="872" class="dependency-line" />
  <text x="575" y="860" class="rel-text">&lt;&lt;include&gt;&gt;</text>

  <!-- Inpatient Rounds <<extend>> Discharge -->
  <line x1="730" y1="900" x2="730" y2="928" class="dependency-line" />
  <text x="772" y="918" class="rel-text">&lt;&lt;extend&gt;&gt;</text>

  <!-- Lab Reports <<extend>> Toggle Share/Local -->
  <line x1="420" y1="885" x2="420" y2="913" class="dependency-line" />
  <text x="468" y="902" class="rel-text">&lt;&lt;extend&gt;&gt;</text>

</svg>"""

# Write SVG file
svg_path = Path("use_case_diagram.svg")
with open(svg_path, "w", encoding="utf-8") as f:
    f.write(svg_content)
print(f"Created SVG at {svg_path}")

# Write interactive HTML viewer with export options
html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>UniCare - UML Use Case Diagram</title>
  <style>
    body {{
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      color: #111827;
      display: flex;
      flex-direction: column;
      align-items: center;
    }}
    .header {{
      text-align: center;
      margin-bottom: 20px;
    }}
    .header h1 {{
      margin: 0 0 6px 0;
      font-size: 24px;
    }}
    .header p {{
      margin: 0;
      color: #4b5563;
      font-size: 14px;
    }}
    .toolbar {{
      margin-bottom: 16px;
      display: flex;
      gap: 12px;
    }}
    .btn {{
      background-color: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      transition: background 0.15s;
    }}
    .btn:hover {{
      background-color: #1d4ed8;
    }}
    .btn-secondary {{
      background-color: #4b5563;
    }}
    .btn-secondary:hover {{
      background-color: #374151;
    }}
    .diagram-container {{
      background: #ffffff;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      max-width: 1400px;
      width: 100%;
      box-sizing: border-box;
      overflow-x: auto;
    }}
    @media print {{
      body {{ background: white; padding: 0; }}
      .toolbar, .header {{ display: none; }}
      .diagram-container {{ box-shadow: none; padding: 0; }}
    }}
  </style>
</head>
<body>

  <div class="header">
    <h1>UniCare Healthcare Management System</h1>
    <p>Standard UML Use Case Diagram (Actors, System Boundary, Use Cases, &lt;&lt;include&gt;&gt; &amp; &lt;&lt;extend&gt;&gt;)</p>
  </div>

  <div class="toolbar">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <a class="btn btn-secondary" href="use_case_diagram.svg" download="unicare_use_case_diagram.svg" style="text-decoration: none;">⬇️ Download Vector SVG</a>
  </div>

  <div class="diagram-container" id="diagram">
    {svg_content}
  </div>

</body>
</html>
"""

html_path = Path("use_case_diagram.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)
print(f"Created HTML viewer at {html_path}")
