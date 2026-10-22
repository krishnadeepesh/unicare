import matplotlib.pyplot as plt
import matplotlib.patches as patches
from pathlib import Path

def generate_unified_use_case():
    # Large high-res canvas
    fig, ax = plt.subplots(figsize=(16, 12), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # System Boundary Box
    box = patches.Rectangle((15, 3), 69, 94, linewidth=1.8, edgecolor='#111827', facecolor='white')
    ax.add_patch(box)
    ax.text(49.5, 95.2, 'UniCare Unified Healthcare System', ha='center', va='center', 
            fontsize=13.5, fontweight='bold', fontfamily='Segoe UI', color='#111827')

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
        # Label
        ax.text(x, y - 7.5, label, ha='center', va='top', fontsize=9.2, fontweight='bold', 
                fontfamily='Segoe UI', color='#111827')

    def draw_oval(ax, x, y, text, w=16.8, h=3.4, fontsize=8.2):
        ellipse = patches.Ellipse((x, y), w, h, edgecolor='#111827', facecolor='white', linewidth=1.2)
        ax.add_patch(ellipse)
        ax.text(x, y, text, ha='center', va='center', fontsize=fontsize, fontweight='normal', 
                fontfamily='Segoe UI', color='#111827')

    # ================= 1. PRIMARY USER (LEFT) =================
    draw_actor(ax, 7.5, 50, 'Patient\n(Primary User)')

    # Left Column Ovals (Patient Use Cases)
    left_x = 31.5
    left_w = 16.5
    left_h = 3.3

    patient_usecases = [
        (89.0, 'Manage Profile & UPID'),
        (82.5, 'Digital Health Card & QR'),
        (76.0, 'Book Doctor Appointment'),
        (69.5, 'Access Digital Prescriptions'),
        (63.0, 'Download Lab Reports'),
        (56.5, 'Shared Medical History'),
        # GAP between 56.5 and 33.5 for clean line to Login
        (33.5, 'Track OPD / IPD Visits'),
        (27.0, 'Feedback & Hospital Review')
    ]

    for y_pos, text in patient_usecases:
        draw_oval(ax, left_x, y_pos, text, left_w, left_h)

    p_pt = (9.5, 50)
    for y_pos, _ in patient_usecases:
        ax.annotate('', xy=(left_x - left_w/2, y_pos), xytext=p_pt,
                    arrowprops=dict(arrowstyle='->', color='#111827', lw=1.1))

    # ================= 2. THE REST OF THE ROLES (RIGHT) =================
    # Positions of 5 right actors:
    # 1. Hospital Admin
    # 2. Doctor
    # 3. Nurse
    # 4. Receptionist
    # 5. Super Admin

    actors_right = [
        (92.5, 85.5, 'Hospital Admin'),
        (92.5, 68.0, 'Doctor'),
        (92.5, 51.5, 'Nurse'),
        (92.5, 34.5, 'Receptionist'),
        (92.5, 17.0, 'Super Admin')
    ]

    for x_pos, y_pos, label in actors_right:
        draw_actor(ax, x_pos, y_pos, label)

    # Right Column Ovals grouped precisely by actor
    right_x = 68.5
    right_w = 17.5
    right_h = 3.2

    # Group 1: Hospital Admin (Y: 89, 83.5)
    ha_cases = [
        (89.0, 'Manage Departments & Staff'),
        (83.0, 'Upload & Verify License')
    ]
    # Group 2: Doctor (Y: 74, 68, 62)
    doc_cases = [
        (73.5, 'Search Patient by UPID'),
        (68.0, 'Clinical Consultation (OPD/IPD)'),
        (62.5, 'Issue Digital Prescription')
    ]
    # Group 3: Nurse (Y: 55, 49)
    nurse_cases = [
        (54.0, 'Record Vitals & Triage'),
        (48.5, 'Inpatient Bed Care & Rounds')
    ]
    # Group 4: Receptionist (Y: 41, 35)
    rec_cases = [
        (40.0, 'Patient Registration & UPID'),
        (34.5, 'Appointment Scheduling & Queue')
    ]
    # Group 5: Super Admin (Y: 26, 20)
    sa_cases = [
        (25.0, 'Approve & Govern Hospitals'),
        (19.0, 'System Audit Logs & Analytics')
    ]

    all_groups = [
        (ha_cases, (90.5, 85.5)),
        (doc_cases, (90.5, 68.0)),
        (nurse_cases, (90.5, 51.5)),
        (rec_cases, (90.5, 34.5)),
        (sa_cases, (90.5, 17.0))
    ]

    for cases, actor_pt in all_groups:
        for y_pos, text in cases:
            draw_oval(ax, right_x, y_pos, text, right_w, right_h, fontsize=8.0)
            ax.annotate('', xy=(right_x + right_w/2, y_pos), xytext=actor_pt,
                        arrowprops=dict(arrowstyle='->', color='#111827', lw=1.1))

    # ================= 3. AUTHENTICATION & SECURITY CLUSTER =================
    center_x = 49.5
    center_w = 14.5
    center_h = 3.4

    # Verify Password (Top of auth cluster)
    draw_oval(ax, center_x, 57.0, 'Verify Password', center_w, center_h, fontsize=8.2)

    # Login (Middle of auth cluster)
    draw_oval(ax, center_x, 45.0, 'Login', center_w, center_h, fontsize=8.8)

    # Invalid Password (Bottom of auth cluster)
    draw_oval(ax, center_x, 33.0, 'Invalid Password', center_w, center_h, fontsize=8.2)

    # Dependencies (<<include>> and <<extend>>)
    # Login -> Verify Password (<<include>>)
    ax.annotate('', xy=(center_x, 57.0 - center_h/2), xytext=(center_x, 45.0 + center_h/2),
                arrowprops=dict(arrowstyle='->', linestyle='dashed', color='#111827', lw=1.3))
    ax.text(center_x + 5.2, 51.0, '<<include>>', fontsize=8.2, fontstyle='italic', ha='center', va='center',
            bbox=dict(boxstyle='square,pad=0.15', facecolor='white', edgecolor='none'))

    # Invalid Password -> Login (<<extend>>)
    ax.annotate('', xy=(center_x, 45.0 - center_h/2), xytext=(center_x, 33.0 + center_h/2),
                arrowprops=dict(arrowstyle='->', linestyle='dashed', color='#111827', lw=1.3))
    ax.text(center_x + 5.2, 39.0, '<<extend>>', fontsize=8.2, fontstyle='italic', ha='center', va='center',
            bbox=dict(boxstyle='square,pad=0.15', facecolor='white', edgecolor='none'))

    # Line from Patient (Left) to Login (passes straight through the gap)
    ax.annotate('', xy=(center_x - center_w/2, 45.0), xytext=p_pt,
                arrowprops=dict(arrowstyle='->', color='#111827', lw=1.1))

    # Lines from Right Actors to Login:
    # Notice: Doctor and Nurse are directly adjacent to Login height!
    # Hospital Admin (top right) and Super Admin (bottom right) connect cleanly.
    ax.annotate('', xy=(center_x + center_w/2, 46.5), xytext=(90.5, 68.0),
                arrowprops=dict(arrowstyle='->', color='#111827', lw=1.0))
    ax.annotate('', xy=(center_x + center_w/2, 45.0), xytext=(90.5, 51.5),
                arrowprops=dict(arrowstyle='->', color='#111827', lw=1.0))
    ax.annotate('', xy=(center_x + center_w/2, 43.5), xytext=(90.5, 34.5),
                arrowprops=dict(arrowstyle='->', color='#111827', lw=1.0))

    # Save PNG
    out_file = Path("use_case_unified.png")
    plt.tight_layout()
    plt.savefig(out_file, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Unified use case diagram saved to {out_file}")

if __name__ == '__main__':
    generate_unified_use_case()
