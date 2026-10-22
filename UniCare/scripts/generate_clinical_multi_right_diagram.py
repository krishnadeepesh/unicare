import matplotlib.pyplot as plt
import matplotlib.patches as patches
from pathlib import Path

def create_clinical_multi_right_diagram(output_path):
    fig, ax = plt.subplots(figsize=(15, 11), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # System Boundary Box
    box = patches.Rectangle((15, 3), 70, 94, linewidth=1.6, edgecolor='#111827', facecolor='white')
    ax.add_patch(box)
    ax.text(50, 95.0, 'UniCare System', ha='center', va='center', fontsize=13, fontweight='bold', fontfamily='Segoe UI')

    def draw_actor(ax, x, y, label):
        # Head
        head = patches.Circle((x, y + 3.8), 1.6, edgecolor='#111827', facecolor='white', linewidth=1.5)
        ax.add_patch(head)
        # Spine
        ax.plot([x, x], [y + 2.2, y - 2.2], color='#111827', linewidth=1.5)
        # Arms
        ax.plot([x - 2.2, x + 2.2], [y + 0.9, y + 0.9], color='#111827', linewidth=1.5)
        # Legs
        ax.plot([x, x - 1.8], [y - 2.2, y - 6.0], color='#111827', linewidth=1.5)
        ax.plot([x, x + 1.8], [y - 2.2, y - 6.0], color='#111827', linewidth=1.5)
        # Label text below feet
        ax.text(x, y - 8.2, label, ha='center', va='top', fontsize=10, fontweight='bold', fontfamily='Segoe UI')

    # 1. PRIMARY USER ON LEFT: Patient alone
    draw_actor(ax, 7.5, 48, 'Patient\n(Primary User)')

    # 2. THE REST OF THE ACTORS ON THE RIGHT SIDE:
    # Top Right: Hospital Admin
    draw_actor(ax, 92.5, 80, 'Hospital Admin')
    # Middle Right: Doctor
    draw_actor(ax, 92.5, 50, 'Doctor')
    # Bottom Right: Super Admin
    draw_actor(ax, 92.5, 20, 'Super Admin')

    def draw_oval(ax, x, y, text, w=17.0, h=3.8):
        ellipse = patches.Ellipse((x, y), w, h, edgecolor='#111827', facecolor='white', linewidth=1.3)
        ax.add_patch(ellipse)
        ax.text(x, y, text, ha='center', va='center', fontsize=8.6, fontweight='normal', fontfamily='Segoe UI')

    # Left Column Ovals (Patient)
    left_x = 33
    left_w = 17.0
    left_h = 3.8

    # Upper Group (6 ovals)
    draw_oval(ax, left_x, 89, 'Manage Profile', left_w, left_h)
    draw_oval(ax, left_x, 82, 'Digital Health Card & QR', left_w, left_h)
    draw_oval(ax, left_x, 75, 'Book Appointment', left_w, left_h)
    draw_oval(ax, left_x, 68, 'View Digital Prescriptions', left_w, left_h)
    draw_oval(ax, left_x, 61, 'Download Lab Reports', left_w, left_h)
    draw_oval(ax, left_x, 54, 'Shared Medical History', left_w, left_h)

    # Gap between 54 and 31 for line to Login

    # Lower Group (2 ovals)
    draw_oval(ax, left_x, 31, 'Track OPD / IPD Visits', left_w, left_h)
    draw_oval(ax, left_x, 24, 'Feedback & Hospital Review', left_w, left_h)

    # Right Column Ovals (The Rest: Hospital Admin, Doctor, Super Admin)
    right_x = 67
    right_w = 17.5
    right_h = 3.8

    # Hospital Admin Ovals (Upper)
    draw_oval(ax, right_x, 89, 'Manage Departments & Staff', right_w, right_h)
    draw_oval(ax, right_x, 82, 'Upload Hospital License', right_w, right_h)
    draw_oval(ax, right_x, 75, 'Manage Bed Allocation', right_w, right_h)

    # Doctor Ovals (Middle)
    draw_oval(ax, right_x, 66, 'Search Patient by UPID', right_w, right_h)
    draw_oval(ax, right_x, 59, 'Clinical Consultation (OP/IP)', right_w, right_h)
    draw_oval(ax, right_x, 52, 'Issue Digital Prescription', right_w, right_h)
    draw_oval(ax, right_x, 45, 'Inpatient Rounds & Discharge', right_w, right_h)

    # Super Admin Ovals (Lower)
    draw_oval(ax, right_x, 36, 'Verify & Approve Hospitals', right_w, right_h)
    draw_oval(ax, right_x, 29, 'Audit Logs & Analytics', right_w, right_h)
    draw_oval(ax, right_x, 22, 'Verify Password', right_w, right_h)

    # Central Authentication Ovals
    center_x = 49.5
    center_w = 13.5
    center_h = 3.8

    # Login in center
    draw_oval(ax, center_x, 40, 'Login', center_w, center_h)
    # Invalid Password below Login
    draw_oval(ax, center_x, 14, 'Invalid Password', center_w, center_h)

    # ----------------- ARROWS FROM PATIENT (Left Actor) -----------------
    p_pt = (9.5, 48)
    for y_pos in [89, 82, 75, 68, 61, 54]:
        ax.annotate('', xy=(left_x - left_w/2, y_pos), xytext=p_pt,
                    arrowprops=dict(arrowstyle='->', color='#111827', lw=1.1))

    # Patient -> Login (clean straight line through the gap)
    ax.annotate('', xy=(center_x - center_w/2, 40), xytext=p_pt,
                arrowprops=dict(arrowstyle='->', color='#111827', lw=1.1))

    for y_pos in [31, 24]:
        ax.annotate('', xy=(left_x - left_w/2, y_pos), xytext=p_pt,
                    arrowprops=dict(arrowstyle='->', color='#111827', lw=1.1))

    # ----------------- ARROWS FROM RIGHT ACTORS -----------------
    # Hospital Admin (Top Right)
    ha_pt = (90.5, 80)
    for y_pos in [89, 82, 75]:
        ax.annotate('', xy=(right_x + right_w/2, y_pos), xytext=ha_pt,
                    arrowprops=dict(arrowstyle='->', color='#111827', lw=1.1))

    # Doctor (Middle Right)
    doc_pt = (90.5, 50)
    for y_pos in [66, 59, 52, 45]:
        ax.annotate('', xy=(right_x + right_w/2, y_pos), xytext=doc_pt,
                    arrowprops=dict(arrowstyle='->', color='#111827', lw=1.1))

    # Super Admin (Bottom Right)
    sa_pt = (90.5, 20)
    for y_pos in [36, 29, 22]:
        ax.annotate('', xy=(right_x + right_w/2, y_pos), xytext=sa_pt,
                    arrowprops=dict(arrowstyle='->', color='#111827', lw=1.1))

    # Connect Doctor & Admins to Login
    ax.annotate('', xy=(center_x + center_w/2, 41.5), xytext=doc_pt,
                arrowprops=dict(arrowstyle='->', color='#111827', lw=1.1))
    ax.annotate('', xy=(center_x + center_w/2, 38.5), xytext=sa_pt,
                arrowprops=dict(arrowstyle='->', color='#111827', lw=1.1))

    # ----------------- DEPENDENCIES (<<include>> and <<extend>>) -----------------
    # Login to Verify Password (<<include>>)
    ax.annotate('', xy=(right_x - right_w/2, 22), xytext=(center_x + center_w/4, 40 - center_h/2),
                arrowprops=dict(arrowstyle='->', linestyle='dashed', color='#111827', lw=1.2))
    ax.text(59, 29, '<<include>>', fontsize=8.2, fontstyle='italic', ha='center', va='center',
            bbox=dict(boxstyle='square,pad=0.15', facecolor='white', edgecolor='none'))

    # Invalid Password to Login (<<extend>>)
    ax.annotate('', xy=(center_x, 40 - center_h/2), xytext=(center_x, 14 + center_h/2),
                arrowprops=dict(arrowstyle='->', linestyle='dashed', color='#111827', lw=1.2))
    ax.text(center_x, 27, '<<extend>>', fontsize=8.2, fontstyle='italic', ha='center', va='center',
            bbox=dict(boxstyle='square,pad=0.15', facecolor='white', edgecolor='none'))

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Created: {output_path}")

create_clinical_multi_right_diagram("use_case_diagram_clinical.png")
