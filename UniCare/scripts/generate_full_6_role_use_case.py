import matplotlib.pyplot as plt
import matplotlib.patches as patches
from pathlib import Path

def generate_unified_use_case_diagram(output_path):
    fig, ax = plt.subplots(figsize=(16.5, 13), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # 1. System Boundary Box
    box = patches.Rectangle((15, 3.0), 69.5, 94.0, linewidth=1.8, edgecolor='#111827', facecolor='white')
    ax.add_patch(box)
    ax.text(49.75, 95.2, 'UniCare System', ha='center', va='center', 
            fontsize=14, fontweight='bold', fontfamily='Segoe UI', color='#111827')

    def draw_actor(ax, x, y, label):
        # Head
        head = patches.Circle((x, y + 3.2), 1.5, edgecolor='#111827', facecolor='white', linewidth=1.5)
        ax.add_patch(head)
        # Spine
        ax.plot([x, x], [y + 1.7, y - 2.0], color='#111827', linewidth=1.5)
        # Arms
        ax.plot([x - 2.0, x + 2.0], [y + 0.6, y + 0.6], color='#111827', linewidth=1.5)
        # Legs
        ax.plot([x, x - 1.6], [y - 2.0, y - 5.5], color='#111827', linewidth=1.5)
        ax.plot([x, x + 1.6], [y - 2.0, y - 5.5], color='#111827', linewidth=1.5)
        # Label text below feet
        ax.text(x, y - 7.6, label, ha='center', va='top', fontsize=9.2, fontweight='bold', 
                fontfamily='Segoe UI', color='#111827')

    def draw_oval(ax, x, y, text, w=16.8, h=3.3, fontsize=8.2):
        ellipse = patches.Ellipse((x, y), w, h, edgecolor='#111827', facecolor='white', linewidth=1.3)
        ax.add_patch(ellipse)
        ax.text(x, y, text, ha='center', va='center', fontsize=fontsize, fontweight='normal', 
                fontfamily='Segoe UI', color='#111827')

    # ================= 1. PRIMARY USER (LEFT) =================
    draw_actor(ax, 7.5, 49.5, 'Patient\n(Primary User)')

    left_x = 31.5
    left_w = 16.8
    left_h = 3.3

    patient_cases = [
        (89.0, 'Manage Profile & UPID'),
        (82.5, 'Digital Health Card & QR'),
        (76.0, 'Book Doctor Appointment'),
        (69.5, 'Access Digital Prescriptions'),
        (63.0, 'Download Lab Reports'),
        (56.5, 'Shared Medical Records'),
        # Open gap between 56.5 and 33.5 for direct line to Login at y=44.5
        (33.5, 'Track OPD / IPD Visits'),
        (27.0, 'Feedback & Hospital Review')
    ]

    p_pt = (9.5, 49.5)
    for y_pos, text in patient_cases:
        draw_oval(ax, left_x, y_pos, text, left_w, left_h, fontsize=8.2)
        ax.annotate('', xy=(left_x - left_w/2, y_pos), xytext=p_pt,
                    arrowprops=dict(arrowstyle='->', color='#111827', lw=1.15))

    # ================= 2. THE REST OF THE 5 ROLES (RIGHT) =================
    # Positions of 5 right actors:
    # Top to bottom: Hospital Admin, Doctor, Nurse, Receptionist, Super Admin
    right_actors = [
        (92.5, 86.0, 'Hospital Admin'),
        (92.5, 68.5, 'Doctor'),
        (92.5, 52.0, 'Nurse'),
        (92.5, 35.5, 'Receptionist'),
        (92.5, 18.5, 'Super Admin')
    ]

    for x_pos, y_pos, label in right_actors:
        draw_actor(ax, x_pos, y_pos, label)

    # Right column use cases grouped cleanly by actor
    right_x = 68.5
    right_w = 17.5
    right_h = 3.2

    # Group 1: Hospital Admin
    ha_cases = [
        (89.0, 'Manage Departments & Staff'),
        (83.0, 'Upload & Verify License')
    ]
    # Group 2: Doctor
    doc_cases = [
        (74.0, 'Search Patient by UPID'),
        (68.5, 'Clinical Consultation (OPD/IPD)'),
        (63.0, 'Issue Digital Prescription')
    ]
    # Group 3: Nurse
    nurse_cases = [
        (54.0, 'Record Vitals & Clinical Triage'),
        (48.5, 'Manage Inpatient Bed Care')
    ]
    # Group 4: Receptionist
    rec_cases = [
        (39.5, 'Patient Registration & UPID'),
        (34.0, 'Schedule & Queue Appointments')
    ]
    # Group 5: Super Admin
    sa_cases = [
        (24.5, 'Verify & Approve Hospitals'),
        (18.5, 'Audit Logs & System Analytics')
    ]

    actor_groups = [
        (ha_cases, (90.5, 86.0)),
        (doc_cases, (90.5, 68.5)),
        (nurse_cases, (90.5, 52.0)),
        (rec_cases, (90.5, 35.5)),
        (sa_cases, (90.5, 18.5))
    ]

    for cases, actor_pt in actor_groups:
        for y_pos, text in cases:
            draw_oval(ax, right_x, y_pos, text, right_w, right_h, fontsize=8.0)
            ax.annotate('', xy=(right_x + right_w/2, y_pos), xytext=actor_pt,
                        arrowprops=dict(arrowstyle='->', color='#111827', lw=1.15))

    # ================= 3. AUTHENTICATION & SECURITY CLUSTER =================
    center_x = 50.0
    center_w = 14.5
    center_h = 3.4

    # Verify Password (Top)
    draw_oval(ax, center_x, 56.5, 'Verify Password', center_w, center_h, fontsize=8.2)

    # Login (Middle)
    draw_oval(ax, center_x, 44.5, 'Login', center_w, center_h, fontsize=8.8)

    # Invalid Password (Bottom)
    draw_oval(ax, center_x, 32.5, 'Invalid Password', center_w, center_h, fontsize=8.2)

    # Dependencies (<<include>> and <<extend>>)
    # Login -> Verify Password (<<include>>)
    ax.annotate('', xy=(center_x, 56.5 - center_h/2), xytext=(center_x, 44.5 + center_h/2),
                arrowprops=dict(arrowstyle='->', linestyle='dashed', color='#111827', lw=1.3))
    ax.text(center_x + 5.2, 50.5, '<<include>>', fontsize=8.2, fontstyle='italic', ha='center', va='center',
            bbox=dict(boxstyle='square,pad=0.15', facecolor='white', edgecolor='none'))

    # Invalid Password -> Login (<<extend>>)
    ax.annotate('', xy=(center_x, 44.5 - center_h/2), xytext=(center_x, 32.5 + center_h/2),
                arrowprops=dict(arrowstyle='->', linestyle='dashed', color='#111827', lw=1.3))
    ax.text(center_x + 5.2, 38.5, '<<extend>>', fontsize=8.2, fontstyle='italic', ha='center', va='center',
            bbox=dict(boxstyle='square,pad=0.15', facecolor='white', edgecolor='none'))

    # Arrow from Patient (Left) to Login through the open gap
    ax.annotate('', xy=(center_x - center_w/2, 44.5), xytext=p_pt,
                arrowprops=dict(arrowstyle='->', color='#111827', lw=1.15))

    # Arrow from the right side into Login:
    # The right actors authenticate via an outer bus behind them at x=96.5,
    # which enters cleanly at y=44.5 through the open corridor between Nurse and Receptionist.
    # This guarantees ZERO crossing lines!
    auth_bus_x = 97.0
    ax.plot([auth_bus_x, auth_bus_x], [18.5, 86.0], color='#111827', linewidth=1.15)
    for _, actor_pt in actor_groups:
        ax.plot([actor_pt[0] + 4.0, auth_bus_x], [actor_pt[1], actor_pt[1]], color='#111827', linewidth=1.15)

    # Corridor from auth bus to Login:
    # From (auth_bus_x, 44.5) to (center_x + center_w/2, 44.5)
    ax.annotate('', xy=(center_x + center_w/2, 44.5), xytext=(auth_bus_x, 44.5),
                arrowprops=dict(arrowstyle='->', color='#111827', lw=1.15))

    plt.tight_layout()
    out = Path(output_path)
    plt.savefig(out, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Generated unified 6-role diagram: {out}")

if __name__ == '__main__':
    generate_unified_use_case_diagram("unicare_all_roles_use_case.png")
    generate_unified_use_case_diagram("use_case_diagram.png")
