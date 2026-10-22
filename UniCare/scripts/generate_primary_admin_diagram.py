import matplotlib.pyplot as plt
import matplotlib.patches as patches
from pathlib import Path
import os

def create_primary_and_admin_diagram(output_path):
    # Dimensions matched to reference image
    fig, ax = plt.subplots(figsize=(13.5, 10), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    # System Boundary Box
    box = patches.Rectangle((15, 3.5), 70, 93, linewidth=1.6, edgecolor='#111827', facecolor='white')
    ax.add_patch(box)
    ax.text(50, 94.5, 'UniCare System', ha='center', va='center', fontsize=13, fontweight='bold', fontfamily='Segoe UI')

    def draw_actor(ax, x, y, label):
        # Head
        head = patches.Circle((x, y + 4.8), 2.0, edgecolor='#111827', facecolor='white', linewidth=1.6)
        ax.add_patch(head)
        # Spine
        ax.plot([x, x], [y + 2.8, y - 2.8], color='#111827', linewidth=1.6)
        # Arms
        ax.plot([x - 2.8, x + 2.8], [y + 1.2, y + 1.2], color='#111827', linewidth=1.6)
        # Legs
        ax.plot([x, x - 2.2], [y - 2.8, y - 7.5], color='#111827', linewidth=1.6)
        ax.plot([x, x + 2.2], [y - 2.8, y - 7.5], color='#111827', linewidth=1.6)
        # Label text below feet
        ax.text(x, y - 10.2, label, ha='center', va='top', fontsize=11.5, fontweight='bold', fontfamily='Segoe UI')

    # Primary User on Left: Patient / User
    draw_actor(ax, 7, 47, 'User\n(Patient)')

    # Rest of Users / Admin on Right
    draw_actor(ax, 93, 56, 'Admin')

    def draw_oval(ax, x, y, text, w=17.5, h=4.3):
        ellipse = patches.Ellipse((x, y), w, h, edgecolor='#111827', facecolor='white', linewidth=1.4)
        ax.add_patch(ellipse)
        ax.text(x, y, text, ha='center', va='center', fontsize=9.2, fontweight='normal', fontfamily='Segoe UI')

    # Left Column Ovals (Patient / Primary User)
    left_x = 34
    left_w = 17.5
    left_h = 4.3

    # Upper Group (6 ovals exactly like reference)
    draw_oval(ax, left_x, 89.0, 'Manage Profile', left_w, left_h)
    draw_oval(ax, left_x, 82.0, 'Digital Health Card & QR', left_w, left_h)
    draw_oval(ax, left_x, 75.0, 'Book Appointment', left_w, left_h)
    draw_oval(ax, left_x, 68.0, 'View Prescriptions', left_w, left_h)
    draw_oval(ax, left_x, 61.0, 'Download Lab Reports', left_w, left_h)
    draw_oval(ax, left_x, 54.0, 'Shared Medical History', left_w, left_h)

    # Gap between 54.0 and 31.0 for the clean arrow to Login

    # Lower Group (2 ovals exactly like reference)
    draw_oval(ax, left_x, 31.0, 'Track OPD / IPD Visits', left_w, left_h)
    draw_oval(ax, left_x, 24.0, 'Feedback & Reviews', left_w, left_h)

    # Right Column Ovals (Admin / The Rest)
    right_x = 66.5
    right_w = 17.8
    right_h = 4.3

    draw_oval(ax, right_x, 85.0, 'Manage Users & Staff', right_w, right_h)
    draw_oval(ax, right_x, 77.5, 'Department Management', right_w, right_h)
    draw_oval(ax, right_x, 70.0, 'Hospital Network Access', right_w, right_h)
    draw_oval(ax, right_x, 62.5, 'Appointment Management', right_w, right_h)
    draw_oval(ax, right_x, 55.0, 'Audit Log & Analytics', right_w, right_h)
    draw_oval(ax, right_x, 47.5, 'Verify Password', right_w, right_h)

    # Authentication Ovals
    center_x = 63.5
    center_w = 16.0
    center_h = 4.3

    # Login
    draw_oval(ax, center_x, 34.0, 'Login', center_w, center_h)

    # Invalid Password (extended)
    draw_oval(ax, center_x, 18.0, 'Invalid Password', center_w, center_h)

    # ----------------- ARROWS FROM PRIMARY USER (Left Actor) -----------------
    user_pt = (9.5, 47.0)

    # Upper 6 use cases
    for y_pos in [89.0, 82.0, 75.0, 68.0, 61.0, 54.0]:
        ax.annotate('', xy=(left_x - left_w/2, y_pos), xytext=user_pt,
                    arrowprops=dict(arrowstyle='->', color='#111827', lw=1.2))

    # Arrow to Login (clean straight line through the gap)
    ax.annotate('', xy=(center_x - center_w/2, 34.0), xytext=user_pt,
                arrowprops=dict(arrowstyle='->', color='#111827', lw=1.2))

    # Lower 2 use cases
    for y_pos in [31.0, 24.0]:
        ax.annotate('', xy=(left_x - left_w/2, y_pos), xytext=user_pt,
                    arrowprops=dict(arrowstyle='->', color='#111827', lw=1.2))

    # ----------------- ARROWS FROM ADMIN (Right Actor) -----------------
    admin_pt = (90.5, 56.0)

    # Admin to right use cases
    for y_pos in [85.0, 77.5, 70.0, 62.5, 55.0, 47.5]:
        ax.annotate('', xy=(right_x + right_w/2, y_pos), xytext=admin_pt,
                    arrowprops=dict(arrowstyle='->', color='#111827', lw=1.2))

    # Arrow to Login
    ax.annotate('', xy=(center_x + center_w/2, 34.0), xytext=admin_pt,
                arrowprops=dict(arrowstyle='->', color='#111827', lw=1.2))

    # ----------------- DEPENDENCIES (<<include>> and <<extend>>) -----------------
    # Login to Verify Password (<<include>>) - Angled dashed arrow
    ax.annotate('', xy=(right_x - 2.5, 47.5 - right_h/2), xytext=(center_x + 1.8, 34.0 + center_h/2),
                arrowprops=dict(arrowstyle='->', linestyle='dashed', color='#111827', lw=1.3))
    ax.text(64.5, 41.5, '<<include>>', fontsize=9.0, fontstyle='italic', ha='center', va='center',
            bbox=dict(boxstyle='square,pad=0.2', facecolor='white', edgecolor='none'))

    # Invalid Password to Login (<<extend>>) - Straight vertical dashed arrow
    ax.annotate('', xy=(center_x, 34.0 - center_h/2), xytext=(center_x, 18.0 + center_h/2),
                arrowprops=dict(arrowstyle='->', linestyle='dashed', color='#111827', lw=1.3))
    ax.text(center_x, 26.0, '<<extend>>', fontsize=9.0, fontstyle='italic', ha='center', va='center',
            bbox=dict(boxstyle='square,pad=0.2', facecolor='white', edgecolor='none'))

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Created: {output_path}")

create_primary_and_admin_diagram("use_case_diagram.png")
