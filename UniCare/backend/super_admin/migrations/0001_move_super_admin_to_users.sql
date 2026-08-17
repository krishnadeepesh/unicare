-- Run this once against db_unicare before deploying the updated backend.
-- It preserves the existing login names and password values in tbl_user.
START TRANSACTION;

INSERT INTO tbl_role (role_name, role_is_active)
VALUES ('Super Admin', 1)
ON DUPLICATE KEY UPDATE role_is_active = VALUES(role_is_active);

INSERT INTO tbl_user (
    hospital_id, role_id, user_name, user_email, user_phone,
    user_password, user_is_active
)
SELECT
    NULL, r.role_id, sa.admin_name, sa.admin_email, sa.admin_phone,
    CONCAT('sha256$', @salt := REPLACE(UUID(), '-', ''), '$',
           SHA2(CONCAT(@salt, sa.admin_password), 256)),
    sa.admin_is_active
FROM tbl_super_admin sa
INNER JOIN tbl_role r
    ON LOWER(REPLACE(REPLACE(r.role_name, ' ', ''), '_', '')) = 'superadmin'
LEFT JOIN tbl_user u
    ON LOWER(u.user_email) = LOWER(sa.admin_email)
WHERE u.user_id IS NULL;

DROP TABLE tbl_super_admin;
COMMIT;
