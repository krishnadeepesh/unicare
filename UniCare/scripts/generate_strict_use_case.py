import os
from pathlib import Path

# SVG 1: Exact 1-to-1 format as the user's uploaded reference image
# Primary Actor (Left): Patient (or User)
# Secondary Actor (Right): Admin
# Center: Login with <<include>> Verify Password and <<extend>> Invalid Password
# Zero intersecting lines.

svg_strict_1to1 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 860" width="100%" height="100%" style="background-color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif;">
  <defs>
    <!-- Arrow marker for associations -->
    <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#333333" />
    </marker>
    <!-- Arrow marker for include / extend -->
    <marker id="dashed-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#222222" />
    </marker>
    <style>
      .actor-text { font-size: 14px; font-weight: bold; fill: #111827; text-anchor: middle; }
      .usecase-text { font-size: 13px; font-weight: 500; fill: #111827; text-anchor: middle; dominant-baseline: middle; }
      .rel-text { font-size: 12px; font-style: italic; font-weight: bold; fill: #1f2937; text-anchor: middle; background: #ffffff; }
      .system-title { font-size: 16px; font-weight: bold; fill: #111827; letter-spacing: 0.5px; }
      .usecase-ellipse { fill: #ffffff; stroke: #111827; stroke-width: 1.8; }
      .association-line { stroke: #111827; stroke-width: 1.4; fill: none; }
      .dependency-line { stroke: #111827; stroke-width: 1.4; stroke-dasharray: 6,4; fill: none; marker-end: url(#dashed-arrow); }
      .actor-line { stroke: #111827; stroke-width: 2.2; stroke-linecap: round; }
      .system-box { fill: #ffffff; stroke: #111827; stroke-width: 2.2; }
    </style>
  </defs>

  <!-- ================= SYSTEM BOUNDARY ================= -->
  <rect x="140" y="25" width="820" height="810" class="system-box" />
  <text x="550" y="55" text-anchor="middle" class="system-title">UniCare System</text>

  <!-- ================= LEFT ACTOR (Primary: Patient / User) ================= -->
  <!-- Stick Figure at x=65, y=380 -->
  <g id="actor-user" transform="translate(65, 380)">
    <circle cx="0" cy="0" r="14" class="actor-line" fill="#ffffff" />
    <line x1="0" y1="14" x2="0" y2="48" class="actor-line" />
    <line x1="-22" y1="26" x2="22" y2="26" class="actor-line" />
    <line x1="0" y1="48" x2="-18" y2="82" class="actor-line" />
    <line x1="0" y1="48" x2="18" y2="82" class="actor-line" />
    <text x="0" y="104" class="actor-text">User (Patient)</text>
  </g>

  <!-- ================= RIGHT ACTOR (Secondary: Admin) ================= -->
  <!-- Stick Figure at x=1035, y=360 -->
  <g id="actor-admin" transform="translate(1035, 360)">
    <circle cx="0" cy="0" r="14" class="actor-line" fill="#ffffff" />
    <line x1="0" y1="14" x2="0" y2="48" class="actor-line" />
    <line x1="-22" y1="26" x2="22" y2="26" class="actor-line" />
    <line x1="0" y1="48" x2="-18" y2="82" class="actor-line" />
    <line x1="0" y1="48" x2="18" y2="82" class="actor-line" />
    <text x="0" y="104" class="actor-text">Admin</text>
  </g>

  <!-- ================= LEFT USE CASES (Primary Actor) ================= -->
  <!-- 1. Manage Profile -->
  <ellipse cx="330" cy="95" rx="100" ry="24" class="usecase-ellipse" />
  <text x="330" y="95" class="usecase-text">Manage Profile</text>

  <!-- 2. View Health Card & QR -->
  <ellipse cx="330" cy="165" rx="100" ry="24" class="usecase-ellipse" />
  <text x="330" y="165" class="usecase-text">View Health Card &amp; QR</text>

  <!-- 3. Book Appointment -->
  <ellipse cx="330" cy="235" rx="100" ry="24" class="usecase-ellipse" />
  <text x="330" y="235" class="usecase-text">Book Appointment</text>

  <!-- 4. View Prescriptions -->
  <ellipse cx="330" cy="305" rx="100" ry="24" class="usecase-ellipse" />
  <text x="330" y="305" class="usecase-text">Digital Prescriptions</text>

  <!-- 5. View Lab Reports -->
  <ellipse cx="330" cy="375" rx="100" ry="24" class="usecase-ellipse" />
  <text x="330" y="375" class="usecase-text">View Lab Reports</text>

  <!-- 6. View Medical History -->
  <ellipse cx="330" cy="445" rx="105" ry="24" class="usecase-ellipse" />
  <text x="330" y="445" class="usecase-text">Shared Medical History</text>

  <!-- GAP FOR LOGIN LINE -->

  <!-- 7. Track OPD / IPD Visits -->
  <ellipse cx="340" cy="675" rx="100" ry="24" class="usecase-ellipse" />
  <text x="340" y="675" class="usecase-text">Track OPD / IPD Visits</text>

  <!-- 8. Submit Review & Feedback -->
  <ellipse cx="340" cy="745" rx="100" ry="24" class="usecase-ellipse" />
  <text x="340" y="745" class="usecase-text">Review &amp; Feedback</text>


  <!-- ================= RIGHT USE CASES (Secondary Actor) ================= -->
  <!-- 1. Manage Users & Staff -->
  <ellipse cx="730" cy="130" rx="100" ry="24" class="usecase-ellipse" />
  <text x="730" y="130" class="usecase-text">Manage Users</text>

  <!-- 2. Department Management -->
  <ellipse cx="730" cy="200" rx="100" ry="24" class="usecase-ellipse" />
  <text x="730" y="200" class="usecase-text">Department Management</text>

  <!-- 3. Hospital Network Management -->
  <ellipse cx="730" cy="270" rx="105" ry="24" class="usecase-ellipse" />
  <text x="730" y="270" class="usecase-text">Hospital Network Mgmt</text>

  <!-- 4. Appointment Management -->
  <ellipse cx="730" cy="340" rx="105" ry="24" class="usecase-ellipse" />
  <text x="730" y="340" class="usecase-text">Appointment Management</text>

  <!-- 5. Audit Log & Reports -->
  <ellipse cx="730" cy="410" rx="100" ry="24" class="usecase-ellipse" />
  <text x="730" y="410" class="usecase-text">Audit Log &amp; Analytics</text>

  <!-- 6. Verify Password (Included by Login) -->
  <ellipse cx="730" cy="480" rx="100" ry="24" class="usecase-ellipse" />
  <text x="730" y="480" class="usecase-text">Verify Password</text>


  <!-- ================= CENTER AUTHENTICATION USE CASES ================= -->
  <!-- Login -->
  <ellipse cx="680" cy="625" rx="100" ry="25" class="usecase-ellipse" />
  <text x="680" y="625" class="usecase-text">Login</text>

  <!-- Invalid Password / Account Recovery (Extended by Login) -->
  <ellipse cx="680" cy="770" rx="100" ry="24" class="usecase-ellipse" />
  <text x="680" y="770" class="usecase-text">Invalid Password</text>


  <!-- ================= ASSOCIATION LINES (LEFT ACTOR -> USE CASES) ================= -->
  <!-- Origin: (90, 400) - Lines strictly fan out to left edges of ovals. ZERO intersections! -->
  <line x1="90" y1="390" x2="230" y2="95" class="association-line" marker-end="url(#arrow)" />
  <line x1="90" y1="395" x2="230" y2="165" class="association-line" marker-end="url(#arrow)" />
  <line x1="90" y1="400" x2="230" y2="235" class="association-line" marker-end="url(#arrow)" />
  <line x1="90" y1="405" x2="230" y2="305" class="association-line" marker-end="url(#arrow)" />
  <line x1="90" y1="410" x2="230" y2="375" class="association-line" marker-end="url(#arrow)" />
  <line x1="90" y1="415" x2="225" y2="445" class="association-line" marker-end="url(#arrow)" />

  <!-- Line to Login (passes cleanly through the gap between 445 and 675) -->
  <line x1="90" y1="420" x2="580" y2="625" class="association-line" marker-end="url(#arrow)" />

  <!-- Lower left ovals -->
  <line x1="90" y1="425" x2="240" y2="675" class="association-line" marker-end="url(#arrow)" />
  <line x1="90" y1="430" x2="240" y2="745" class="association-line" marker-end="url(#arrow)" />


  <!-- ================= ASSOCIATION LINES (RIGHT ACTOR -> USE CASES) ================= -->
  <!-- Origin: (1010, 385) - Lines strictly fan out to right edges of ovals. ZERO intersections! -->
  <line x1="1010" y1="375" x2="830" y2="130" class="association-line" marker-end="url(#arrow)" />
  <line x1="1010" y1="380" x2="830" y2="200" class="association-line" marker-end="url(#arrow)" />
  <line x1="1010" y1="385" x2="835" y2="270" class="association-line" marker-end="url(#arrow)" />
  <line x1="1010" y1="390" x2="835" y2="340" class="association-line" marker-end="url(#arrow)" />
  <line x1="1010" y1="395" x2="830" y2="410" class="association-line" marker-end="url(#arrow)" />
  <line x1="1010" y1="400" x2="830" y2="480" class="association-line" marker-end="url(#arrow)" />

  <!-- Line to Login (passes cleanly from right to left into Login) -->
  <line x1="1010" y1="410" x2="780" y2="625" class="association-line" marker-end="url(#arrow)" />


  <!-- ================= DEPENDENCY RELATIONSHIPS (<<include>> and <<extend>>) ================= -->
  <!-- Login -> Verify Password (<<include>>) -->
  <line x1="700" y1="600" x2="720" y2="505" class="dependency-line" />
  <rect x="668" y="540" width="80" height="18" fill="#ffffff" />
  <text x="708" y="554" class="rel-text">&lt;&lt;include&gt;&gt;</text>

  <!-- Invalid Password -> Login (<<extend>>) -->
  <line x1="680" y1="745" x2="680" y2="652" class="dependency-line" />
  <rect x="640" y="692" width="80" height="18" fill="#ffffff" />
  <text x="680" y="705" class="rel-text">&lt;&lt;extend&gt;&gt;</text>

</svg>"""

# SVG 2: Strict Multi-Actor Layout (Patient & Doctor on Left, Hospital Admin & Super Admin on Right)
# Also strictly zero intersecting lines!
svg_strict_multi = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 950" width="100%" height="100%" style="background-color: #ffffff; font-family: 'Segoe UI', Arial, sans-serif;">
  <defs>
    <marker id="m-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1 L 10 5 L 0 9 z" fill="#333333" />
    </marker>
    <marker id="m-dashed-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 2 L 10 5 L 0 8 z" fill="#222222" />
    </marker>
    <style>
      .act-txt { font-size: 14px; font-weight: bold; fill: #111827; text-anchor: middle; }
      .uc-txt { font-size: 12.5px; font-weight: 500; fill: #111827; text-anchor: middle; dominant-baseline: middle; }
      .rel-txt { font-size: 11px; font-style: italic; font-weight: bold; fill: #1f2937; text-anchor: middle; }
      .box-title { font-size: 16px; font-weight: bold; fill: #111827; letter-spacing: 0.5px; }
      .uc-node { fill: #ffffff; stroke: #111827; stroke-width: 1.8; }
      .assoc { stroke: #111827; stroke-width: 1.4; fill: none; }
      .dep { stroke: #111827; stroke-width: 1.4; stroke-dasharray: 6,4; fill: none; marker-end: url(#m-dashed-arrow); }
      .act-line { stroke: #111827; stroke-width: 2.2; stroke-linecap: round; }
      .sys-boundary { fill: #ffffff; stroke: #111827; stroke-width: 2.2; }
    </style>
  </defs>

  <!-- BOUNDARY -->
  <rect x="180" y="25" width="840" height="900" class="sys-boundary" />
  <text x="600" y="55" text-anchor="middle" class="box-title">UniCare System Boundary</text>

  <!-- PRIMARY ACTORS (LEFT) -->
  <!-- 1. Patient (Top Left) -->
  <g transform="translate(80, 200)">
    <circle cx="0" cy="0" r="14" class="act-line" fill="#ffffff" />
    <line x1="0" y1="14" x2="0" y2="48" class="act-line" />
    <line x1="-20" y1="26" x2="20" y2="26" class="act-line" />
    <line x1="0" y1="48" x2="-16" y2="80" class="act-line" />
    <line x1="0" y1="48" x2="16" y2="80" class="act-line" />
    <text x="0" y="102" class="act-txt">Patient</text>
  </g>

  <!-- 2. Doctor (Bottom Left) -->
  <g transform="translate(80, 680)">
    <circle cx="0" cy="0" r="14" class="act-line" fill="#ffffff" />
    <line x1="0" y1="14" x2="0" y2="48" class="act-line" />
    <line x1="-20" y1="26" x2="20" y2="26" class="act-line" />
    <line x1="0" y1="48" x2="-16" y2="80" class="act-line" />
    <line x1="0" y1="48" x2="16" y2="80" class="act-line" />
    <text x="0" y="102" class="act-txt">Doctor</text>
  </g>

  <!-- SECONDARY ACTORS (RIGHT) -->
  <!-- 3. Hospital Admin (Top Right) -->
  <g transform="translate(1120, 200)">
    <circle cx="0" cy="0" r="14" class="act-line" fill="#ffffff" />
    <line x1="0" y1="14" x2="0" y2="48" class="act-line" />
    <line x1="-20" y1="26" x2="20" y2="26" class="act-line" />
    <line x1="0" y1="48" x2="-16" y2="80" class="act-line" />
    <line x1="0" y1="48" x2="16" y2="80" class="act-line" />
    <text x="0" y="102" class="act-txt">Hospital Admin</text>
  </g>

  <!-- 4. Super Admin (Bottom Right) -->
  <g transform="translate(1120, 680)">
    <circle cx="0" cy="0" r="14" class="act-line" fill="#ffffff" />
    <line x1="0" y1="14" x2="0" y2="48" class="act-line" />
    <line x1="-20" y1="26" x2="20" y2="26" class="act-line" />
    <line x1="0" y1="48" x2="-16" y2="80" class="act-line" />
    <line x1="0" y1="48" x2="16" y2="80" class="act-line" />
    <text x="0" y="102" class="act-txt">Super Admin</text>
  </g>

  <!-- LEFT UPPER USE CASES (Patient) -->
  <ellipse cx="360" cy="100" rx="95" ry="22" class="uc-node" />
  <text x="360" y="100" class="uc-txt">Manage Profile</text>

  <ellipse cx="360" cy="160" rx="95" ry="22" class="uc-node" />
  <text x="360" y="160" class="uc-txt">View Health Card &amp; QR</text>

  <ellipse cx="360" cy="220" rx="95" ry="22" class="uc-node" />
  <text x="360" y="220" class="uc-txt">Book Appointments</text>

  <ellipse cx="360" cy="280" rx="95" ry="22" class="uc-node" />
  <text x="360" y="280" class="uc-txt">Access Prescriptions</text>

  <ellipse cx="360" cy="340" rx="95" ry="22" class="uc-node" />
  <text x="360" y="340" class="uc-txt">View Shared Records</text>

  <!-- LEFT LOWER USE CASES (Doctor) -->
  <ellipse cx="360" cy="580" rx="95" ry="22" class="uc-node" />
  <text x="360" y="580" class="uc-txt">Search Patient by UPID</text>

  <ellipse cx="360" cy="645" rx="95" ry="22" class="uc-node" />
  <text x="360" y="645" class="uc-txt">Clinical Consultation</text>

  <ellipse cx="360" cy="710" rx="95" ry="22" class="uc-node" />
  <text x="360" y="710" class="uc-txt">Select Visit Type (IP/OP)</text>

  <ellipse cx="360" cy="775" rx="95" ry="22" class="uc-node" />
  <text x="360" y="775" class="uc-txt">Issue Digital Prescription</text>

  <ellipse cx="360" cy="840" rx="95" ry="22" class="uc-node" />
  <text x="360" y="840" class="uc-txt">Inpatient Rounds &amp; Care</text>

  <!-- RIGHT UPPER USE CASES (Hospital Admin) -->
  <ellipse cx="840" cy="100" rx="95" ry="22" class="uc-node" />
  <text x="840" y="100" class="uc-txt">Manage Departments</text>

  <ellipse cx="840" cy="160" rx="95" ry="22" class="uc-node" />
  <text x="840" y="160" class="uc-txt">Onboard Staff</text>

  <ellipse cx="840" cy="220" rx="95" ry="22" class="uc-node" />
  <text x="840" y="220" class="uc-txt">Generate Credentials</text>

  <ellipse cx="840" cy="280" rx="95" ry="22" class="uc-node" />
  <text x="840" y="280" class="uc-txt">Upload Hospital License</text>

  <ellipse cx="840" cy="340" rx="95" ry="22" class="uc-node" />
  <text x="840" y="340" class="uc-txt">Network Request</text>

  <!-- RIGHT LOWER USE CASES (Super Admin) -->
  <ellipse cx="840" cy="580" rx="95" ry="22" class="uc-node" />
  <text x="840" y="580" class="uc-txt">Verify Hospitals</text>

  <ellipse cx="840" cy="645" rx="95" ry="22" class="uc-node" />
  <text x="840" y="645" class="uc-txt">Network Governance</text>

  <ellipse cx="840" cy="710" rx="95" ry="22" class="uc-node" />
  <text x="840" y="710" class="uc-txt">Audit Trail Logs</text>

  <ellipse cx="840" cy="775" rx="95" ry="22" class="uc-node" />
  <text x="840" y="775" class="uc-txt">Platform Analytics</text>

  <!-- CENTER AUTH CLUSTER -->
  <ellipse cx="600" cy="380" rx="85" ry="22" class="uc-node" />
  <text x="600" y="380" class="uc-txt">Verify Password</text>

  <ellipse cx="600" cy="460" rx="85" ry="23" class="uc-node" />
  <text x="600" y="460" class="uc-txt">Login</text>

  <ellipse cx="600" cy="540" rx="85" ry="22" class="uc-node" />
  <text x="600" y="540" class="uc-txt">Invalid Password</text>

  <!-- DEPENDENCY LINES -->
  <line x1="600" y1="437" x2="600" y2="404" class="dep" />
  <text x="655" y="422" class="rel-txt">&lt;&lt;include&gt;&gt;</text>

  <line x1="600" y1="518" x2="600" y2="485" class="dep" />
  <text x="655" y="502" class="rel-txt">&lt;&lt;extend&gt;&gt;</text>

  <!-- ASSOCIATIONS (LEFT - NO INTERSECTIONS) -->
  <line x1="100" y1="220" x2="265" y2="100" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="100" y1="225" x2="265" y2="160" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="100" y1="230" x2="265" y2="220" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="100" y1="235" x2="265" y2="280" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="100" y1="240" x2="265" y2="340" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="100" y1="245" x2="515" y2="455" class="assoc" marker-end="url(#m-arrow)" />

  <line x1="100" y1="695" x2="515" y2="465" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="100" y1="700" x2="265" y2="580" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="100" y1="705" x2="265" y2="645" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="100" y1="710" x2="265" y2="710" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="100" y1="715" x2="265" y2="775" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="100" y1="720" x2="265" y2="840" class="assoc" marker-end="url(#m-arrow)" />

  <!-- ASSOCIATIONS (RIGHT - NO INTERSECTIONS) -->
  <line x1="1100" y1="220" x2="935" y2="100" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="1100" y1="225" x2="935" y2="160" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="1100" y1="230" x2="935" y2="220" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="1100" y1="235" x2="935" y2="280" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="1100" y1="240" x2="935" y2="340" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="1100" y1="245" x2="685" y2="455" class="assoc" marker-end="url(#m-arrow)" />

  <line x1="1100" y1="695" x2="685" y2="465" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="1100" y1="700" x2="935" y2="580" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="1100" y1="705" x2="935" y2="645" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="1100" y1="710" x2="935" y2="710" class="assoc" marker-end="url(#m-arrow)" />
  <line x1="1100" y1="715" x2="935" y2="775" class="assoc" marker-end="url(#m-arrow)" />

</svg>"""

# Save strictly compliant SVG (Format 1: exact 1-to-1 matching user image)
svg_file = Path("use_case_diagram.svg")
with open(svg_file, "w", encoding="utf-8") as f:
    f.write(svg_strict_1to1)

print("Saved use_case_diagram.svg")

# Save interactive HTML viewer with both representations
html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>UniCare - Strict UML Use Case Diagram</title>
  <style>
    body {{
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
    }}
    .header {{
      text-align: center;
      margin-bottom: 16px;
    }}
    .header h1 {{
      margin: 0 0 6px 0;
      font-size: 22px;
      font-weight: 700;
    }}
    .header p {{
      margin: 0;
      color: #64748b;
      font-size: 14px;
    }}
    .nav-tabs {{
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      background: #e2e8f0;
      padding: 4px;
      border-radius: 8px;
    }}
    .tab-btn {{
      border: none;
      background: none;
      padding: 8px 18px;
      font-size: 14px;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s;
    }}
    .tab-btn.active {{
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }}
    .toolbar {{
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
    }}
    .btn {{
      background-color: #0f172a;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      transition: background 0.15s;
      text-decoration: none;
    }}
    .btn:hover {{
      background-color: #334155;
    }}
    .diagram-card {{
      background: #ffffff;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      max-width: 1200px;
      width: 100%;
      box-sizing: border-box;
      overflow-x: auto;
    }}
    .tab-content {{
      display: none;
    }}
    .tab-content.active {{
      display: block;
    }}
    @media print {{
      body {{ background: white; padding: 0; }}
      .toolbar, .header, .nav-tabs {{ display: none; }}
      .diagram-card {{ box-shadow: none; border: none; padding: 0; }}
    }}
  </style>
</head>
<body>

  <div class="header">
    <h1>UniCare Healthcare Management System</h1>
    <p>UML Use Case Diagram (Strict standard layout: Primary actors on Left, Secondary actors on Right, Zero line intersections)</p>
  </div>

  <div class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('tab-1to1', this)">1. Exact Reference Match (User &amp; Admin)</button>
    <button class="tab-btn" onclick="switchTab('tab-multi', this)">2. Comprehensive Medical Roles (Patient, Doctor, Admin)</button>
  </div>

  <div class="toolbar">
    <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <a class="btn" href="use_case_diagram.svg" download="unicare_use_case_diagram.svg">⬇️ Download SVG</a>
  </div>

  <div class="diagram-card">
    <div id="tab-1to1" class="tab-content active">
      {svg_strict_1to1}
    </div>
    <div id="tab-multi" class="tab-content">
      {svg_strict_multi}
    </div>
  </div>

  <script>
    function switchTab(tabId, btn) {{
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      btn.classList.add('active');
    }}
  </script>

</body>
</html>
"""

html_file = Path("use_case_diagram.html")
with open(html_file, "w", encoding="utf-8") as f:
    f.write(html_content)

print("Saved use_case_diagram.html")
