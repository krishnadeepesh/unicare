import matplotlib.pyplot as plt
import matplotlib.patches as patches
from pathlib import Path

# Create figure with high DPI
fig, ax = plt.subplots(figsize=(13, 9.5), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 100)
ax.axis('off')

# 1. System Boundary Box
box = patches.Rectangle((15, 3), 70, 94, linewidth=1.5, edgecolor='black', facecolor='white')
ax.add_patch(box)
ax.text(50, 95.2, 'UniCare System', ha='center', va='center', fontsize=12.5, fontweight='bold', fontfamily='sans-serif')

def draw_stick_figure(ax, x, y, label):
    # Head
    head = patches.Circle((x, y + 4.5), 1.8, edgecolor='black', facecolor='white', linewidth=1.5)
    ax.add_patch(head)
    # Body
    ax.plot([x, x], [y + 2.7, y - 2.5], color='black', linewidth=1.5)
    # Arms
    ax.plot([x - 2.5, x + 2.5], [y + 1.2, y + 1.2], color='black', linewidth=1.5)
    # Legs
    ax.plot([x, x - 2], [y - 2.5, y - 7], color='black', linewidth=1.5)
    ax.plot([x, x + 2], [y - 2.5, y - 7], color='black', linewidth=1.5)
    # Label
    ax.text(x, y - 9.5, label, ha='center', va='top', fontsize=11, fontweight='normal', fontfamily='sans-serif')

# Primary Actor on Left: User / Patient
draw_stick_figure(ax, 7, 47, 'User')

# Secondary Actor on Right: Admin
draw_stick_figure(ax, 93, 55, 'Admin')

def draw_oval(ax, x, y, text, w=16.8, h=4.2):
    ellipse = patches.Ellipse((x, y), w, h, edgecolor='black', facecolor='white', linewidth=1.3)
    ax.add_patch(ellipse)
    ax.text(x, y, text, ha='center', va='center', fontsize=9.2, fontfamily='sans-serif')

# Left Column Ovals (UniCare Patient & Clinical features)
left_x = 33.5
left_w = 17.2
left_h = 4.2

# Group 1 (Upper 6 ovals)
draw_oval(ax, left_x, 89, 'Manage Profile', left_w, left_h)
draw_oval(ax, left_x, 82, 'Digital Health Card & QR', left_w, left_h)
draw_oval(ax, left_x, 75, 'Book Appointment', left_w, left_h)
draw_oval(ax, left_x, 68, 'Access Digital Prescriptions', left_w, left_h)
draw_oval(ax, left_x, 61, 'Download Lab Reports', left_w, left_h)
draw_oval(ax, left_x, 54, 'Shared Medical History', left_w, left_h)

# GAP between 54 and 31 (for line to Login)

# Group 2 (Lower 2 ovals)
draw_oval(ax, left_x, 31, 'Track OPD / IPD Visits', left_w, left_h)
draw_oval(ax, left_x, 24, 'Hospital Network Access', left_w, left_h)

# Right Column Ovals (UniCare Admin & Hospital management)
right_x = 66.5
right_w = 17.5
right_h = 4.2

draw_oval(ax, right_x, 85, 'Manage Users & Staff', right_w, right_h)
draw_oval(ax, right_x, 77.5, 'Department Management', right_w, right_h)
draw_oval(ax, right_x, 70, 'Hospital Verification & Approval', right_w, right_h)
draw_oval(ax, right_x, 62.5, 'Appointment Management', right_w, right_h)
draw_oval(ax, right_x, 55, 'Audit Log & Analytics', right_w, right_h)
draw_oval(ax, right_x, 47.5, 'Verify Password', right_w, right_h)

# Center Authentication Ovals
center_x = 63
center_w = 15
center_h = 4.2

# Login
draw_oval(ax, center_x, 34, 'Login', center_w, center_h)

# Invalid Password (below Login)
draw_oval(ax, center_x, 18, 'Invalid Password', center_w, center_h)

# ----------------- ARROWS FROM USER (Left Actor) -----------------
user_pt = (9.5, 47)

# Upper 6 ovals
ax.annotate('', xy=(left_x - left_w/2, 89), xytext=user_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 82), xytext=user_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 75), xytext=user_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 68), xytext=user_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 61), xytext=user_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 54), xytext=user_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))

# Arrow to Login (passes cleanly through the gap)
ax.annotate('', xy=(center_x - center_w/2, 34), xytext=user_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))

# Lower 2 ovals
ax.annotate('', xy=(left_x - left_w/2, 31), xytext=user_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(left_x - left_w/2, 24), xytext=user_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))

# ----------------- ARROWS FROM ADMIN (Right Actor) -----------------
admin_pt = (90.5, 55)

ax.annotate('', xy=(right_x + right_w/2, 85), xytext=admin_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 77.5), xytext=admin_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 70), xytext=admin_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 62.5), xytext=admin_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 55), xytext=admin_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))
ax.annotate('', xy=(right_x + right_w/2, 47.5), xytext=admin_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))

# Arrow to Login
ax.annotate('', xy=(center_x + center_w/2, 34), xytext=admin_pt, arrowprops=dict(arrowstyle='->', color='black', lw=1.1))

# ----------------- DEPENDENCIES (<<include>> and <<extend>>) -----------------
# Login to Verify Password (<<include>>) - Angled up-right exactly like user reference
ax.annotate('', xy=(right_x - 2, 47.5 - right_h/2), xytext=(center_x + 1.5, 34 + center_h/2),
            arrowprops=dict(arrowstyle='->', linestyle='dashed', color='black', lw=1.2))
ax.text(64.2, 41.5, '<<include>>', fontsize=8.5, fontstyle='italic', ha='center', va='center',
        bbox=dict(boxstyle='square,pad=0.15', facecolor='white', edgecolor='none'))

# Invalid Password to Login (<<extend>>) - Straight vertical exactly like user reference
ax.annotate('', xy=(center_x, 34 - center_h/2), xytext=(center_x, 18 + center_h/2),
            arrowprops=dict(arrowstyle='->', linestyle='dashed', color='black', lw=1.2))
ax.text(center_x, 26, '<<extend>>', fontsize=8.5, fontstyle='italic', ha='center', va='center',
        bbox=dict(boxstyle='square,pad=0.15', facecolor='white', edgecolor='none'))

plt.tight_layout()
out_png = Path("use_case_diagram.png")
plt.savefig(out_png, dpi=300, bbox_inches='tight')
print(f"Diagram saved to {out_png}")
