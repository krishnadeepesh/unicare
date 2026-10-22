import matplotlib.pyplot as plt
import matplotlib.patches as patches
from pathlib import Path

# Create figure
fig, ax = plt.subplots(figsize=(14, 10), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

# System Boundary Box
box = patches.Rectangle((16, 3), 68, 94, linewidth=1.5, edgecolor='black', facecolor='white')
ax.add_patch(box)
ax.text(50, 95.2, 'UniCare System', ha='center', va='center', fontsize=12.5, fontweight='bold', fontfamily='sans-serif')

def draw_stick_figure(ax, x, y, label):
    # Head
    head = patches.Circle((x, y + 4.2), 1.7, edgecolor='black', facecolor='white', linewidth=1.5)
    ax.add_patch(head)
    # Body
    ax.plot([x, x], [y + 2.5, y - 2.5], color='black', linewidth=1.5)
    # Arms
    ax.plot([x - 2.5, x + 2.5], [y + 1, y + 1], color='black', linewidth=1.5)
    # Legs
    ax.plot([x, x - 2], [y - 2.5, y - 6.5], color='black', linewidth=1.5)
    ax.plot([x, x + 2], [y - 2.5, y - 6.5], color='black', linewidth=1.5)
    # Label
    ax.text(x, y - 9.0, label, ha='center', va='top', fontsize=10.5, fontweight='bold', fontfamily='sans-serif')

# Primary Actors on Left
draw_stick_figure(ax, 7, 72, 'Patient')
draw_stick_figure(ax, 7, 24, 'Doctor')

# Secondary Actors on Right
draw_stick_figure(ax, 93, 72, 'Hospital Admin')
draw_stick_figure(ax, 93, 24, 'Super Admin')

def draw_oval(ax, x, y, text, w=16.5, h=4.0):
    ellipse = patches.Ellipse((x, y), w, h, edgecolor='black', facecolor='white', linewidth=1.3)
    ax.add_patch(ellipse)
    ax.text(x, y, text, ha='center', va='center', fontsize=8.8, fontfamily='sans-serif')

left_x = 32
left_w = 16.5
left_h = 4.0

# Patient Use Cases (Upper Left)
draw_oval(ax, left_x, 90, 'Manage Profile', left_w, left_h)
draw_oval(ax, left_x, 83, 'Digital Health Card & QR', left_w, left_h)
draw_oval(ax, left_x, 76, 'Book Appointment', left_w, left_h)
draw_oval(ax, left_x, 69, 'View Prescriptions', left_w, left_h)
draw_oval(ax, left_x, 62, 'Shared Medical History', left_w, left_h)

# Doctor Use Cases (Lower Left)
draw_oval(ax, left_x, 38, 'Search Patient by UPID', left_w, left_h)
draw_oval(ax, left_x, 31, 'Clinical Consultation', left_w, left_h)
draw_oval(ax, left_x, 24, 'Select Visit Type (IP/OP)', left_w, left_h)
draw_oval(ax, left_x, 17, 'Issue Digital Prescription', left_w, left_h)
draw_oval(ax, left_x, 10, 'Inpatient Rounds & Discharge', left_w, left_h)

right_x = 68
right_w = 17.5
right_h = 4.0

# Hospital Admin Use Cases (Upper Right)
draw_oval(ax, right_x, 90, 'Manage Departments', right_w, right_h)
draw_oval(ax, right_x, 83, 'Onboard Doctors & Nurses', right_w, right_h)
draw_oval(ax, right_x, 76, 'Generate Staff Credentials', right_w, right_h)
draw_oval(ax, right_x, 69, 'Upload Hospital License', right_w, right_h)
draw_oval(ax, right_x, 62, 'Verify Password', right_w, right_h)

# Super Admin Use Cases (Lower Right)
draw_oval(ax, right_x, 38, 'Verify & Approve Hospitals', right_w, right_h)
draw_oval(ax, right_x, 31, 'Hospital Network Governance', right_w, right_h)
draw_oval(ax, right_x, 24, 'Audit Trail & System Logs', right_w, right_h)
draw_oval(ax, right_x, 17, 'Platform Analytics & Stats', right_w, right_h)
draw_oval(ax, right_x, 10, 'Security Policy Control', right_w, right_h)

# Center Authentication Cluster
center_x = 50
center_w = 14
center_h = 4.0

draw_oval(ax, center_x, 50, 'Login', center_w, center_h)
draw_oval(ax, center_x, 41, 'Invalid Password', center_w, center_h)

# Associations from Patient (Upper Left)
p_pt = (9.5, 72)
ax.annotate('', xy=(left_x - left_w/2, 90), xytext=p_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 83), xytext=p_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 76), xytext=p_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 69), xytext=p_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 62), xytext=p_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(center_x - center_w/2, 51), xytext=p_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))

# Associations from Doctor (Lower Left)
d_pt = (9.5, 24)
ax.annotate('', xy=(center_x - center_w/2, 49), xytext=d_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 38), xytext=d_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 31), xytext=d_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 24), xytext=d_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 17), xytext=d_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 10), xytext=d_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))

# Associations from Hospital Admin (Upper Right)
ha_pt = (90.5, 72)
ax.annotate('', xy=(right_x + right_w/2, 90), xytext=ha_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 83), xytext=ha_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 76), xytext=ha_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 69), xytext=ha_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 62), xytext=ha_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(center_x + center_w/2, 51), xytext=ha_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))

# Associations from Super Admin (Lower Right)
sa_pt = (90.5, 24)
ax.annotate('', xy=(center_x + center_w/2, 49), xytext=sa_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 38), xytext=sa_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 31), xytext=sa_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 24), xytext=sa_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 17), xytext=sa_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 10), xytext=sa_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))

# Dependencies: Login -> Verify Password (<<include>>)
ax.annotate('', xy=(right_x - right_w/2, 62), xytext=(center_x + center_w/4, 52),
            arrowprops=dict(arrowstyle='->', linestyle='dashed', color='black', lw=1.2))
ax.text(58.5, 58, '<<include>>', fontsize=8.2, fontstyle='italic', ha='center', va='center',
        bbox=dict(boxstyle='square,pad=0.15', facecolor='white', edgecolor='none'))

# Dependencies: Invalid Password -> Login (<<extend>>)
ax.annotate('', xy=(center_x, 50 - center_h/2), xytext=(center_x, 41 + center_h/2),
            arrowprops=dict(arrowstyle='->', linestyle='dashed', color='black', lw=1.2))
ax.text(center_x, 45.5, '<<extend>>', fontsize=8.2, fontstyle='italic', ha='center', va='center',
        bbox=dict(boxstyle='square,pad=0.15', facecolor='white', edgecolor='none'))

plt.tight_layout()
out_png = Path("use_case_diagram_clinical.png")
plt.savefig(out_png, dpi=300, bbox_inches='tight')
print(f"Clinical Diagram saved to {out_png}")
