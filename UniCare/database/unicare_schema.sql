-- UniCare Database Schema
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS auth_group;
CREATE TABLE `auth_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS auth_group_permissions;
CREATE TABLE `auth_group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS auth_permission;
CREATE TABLE `auth_permission` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `content_type_id` int NOT NULL,
  `codename` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`),
  CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS auth_user;
CREATE TABLE `auth_user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) NOT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS auth_user_groups;
CREATE TABLE `auth_user_groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `group_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_groups_user_id_group_id_94350c0c_uniq` (`user_id`,`group_id`),
  KEY `auth_user_groups_group_id_97559544_fk_auth_group_id` (`group_id`),
  CONSTRAINT `auth_user_groups_group_id_97559544_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  CONSTRAINT `auth_user_groups_user_id_6a12ed8b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS auth_user_user_permissions;
CREATE TABLE `auth_user_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_user_user_permissions_user_id_permission_id_14a6b632_uniq` (`user_id`,`permission_id`),
  KEY `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` (`permission_id`),
  CONSTRAINT `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  CONSTRAINT `auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS django_admin_log;
CREATE TABLE `django_admin_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint unsigned NOT NULL,
  `change_message` longtext NOT NULL,
  `content_type_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  KEY `django_admin_log_user_id_c564eba6_fk_auth_user_id` (`user_id`),
  CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  CONSTRAINT `django_admin_log_user_id_c564eba6_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`),
  CONSTRAINT `django_admin_log_chk_1` CHECK ((`action_flag` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS django_content_type;
CREATE TABLE `django_content_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS django_migrations;
CREATE TABLE `django_migrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS django_session;
CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL,
  PRIMARY KEY (`session_key`),
  KEY `django_session_expire_date_a5c62663` (`expire_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_admission;
CREATE TABLE `tbl_admission` (
  `admission_id` int NOT NULL AUTO_INCREMENT,
  `admission_uid` varchar(30) DEFAULT NULL,
  `patient_id` int NOT NULL,
  `hospital_id` int NOT NULL,
  `admitting_doctor_id` int NOT NULL,
  `admission_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `admission_status` varchar(30) NOT NULL DEFAULT 'Admitted',
  `discharge_date` datetime DEFAULT NULL,
  `ward_bed` varchar(50) DEFAULT NULL,
  `admission_reason` text,
  `discharge_summary` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`admission_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_appointment;
CREATE TABLE `tbl_appointment` (
  `appointment_id` int NOT NULL AUTO_INCREMENT,
  `patient_id` int NOT NULL,
  `hospital_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `doctor_id` int NOT NULL,
  `appointment_date` date NOT NULL,
  `appointment_time` varchar(20) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_by_user_id` int DEFAULT NULL,
  `appointment_status` enum('Pending','Confirmed','Completed','Cancelled') NOT NULL,
  `appointment_is_active` tinyint(1) DEFAULT '1',
  `appointment_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`appointment_id`),
  KEY `fk_appointment_patient` (`patient_id`),
  KEY `fk_appointment_doctor` (`doctor_id`),
  CONSTRAINT `fk_appointment_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `tbl_doctor` (`doctor_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_appointment_patient` FOREIGN KEY (`patient_id`) REFERENCES `tbl_patient` (`patient_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_audit_log;
CREATE TABLE `tbl_audit_log` (
  `audit_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `audit_action` varchar(200) NOT NULL,
  `audit_module` varchar(100) NOT NULL,
  `audit_ip_address` varchar(50) DEFAULT NULL,
  `audit_datetime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`audit_id`),
  KEY `fk_audit_user` (`user_id`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=235 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_department;
CREATE TABLE `tbl_department` (
  `department_id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int NOT NULL,
  `department_name` varchar(100) NOT NULL,
  `department_description` text,
  `department_is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`department_id`),
  KEY `fk_department_hospital` (`hospital_id`),
  CONSTRAINT `fk_department_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `tbl_hospital` (`hospital_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_doctor;
CREATE TABLE `tbl_doctor` (
  `doctor_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `hospital_id` int DEFAULT NULL,
  `department_id` int NOT NULL,
  `doctor_license_no` varchar(50) NOT NULL,
  `doctor_specialization` varchar(100) NOT NULL,
  `doctor_qualification` varchar(100) DEFAULT NULL,
  `doctor_experience` varchar(100) DEFAULT NULL,
  `doctor_is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`doctor_id`),
  UNIQUE KEY `doctor_license_no` (`doctor_license_no`),
  UNIQUE KEY `uq_doctor_user` (`user_id`),
  KEY `fk_doctor_department` (`department_id`),
  CONSTRAINT `fk_doctor_department` FOREIGN KEY (`department_id`) REFERENCES `tbl_department` (`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_doctor_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_hospital;
CREATE TABLE `tbl_hospital` (
  `hospital_id` int NOT NULL AUTO_INCREMENT,
  `hospital_uid` varchar(20) NOT NULL,
  `hospital_name` varchar(100) NOT NULL,
  `hospital_email` varchar(100) DEFAULT NULL,
  `hospital_phone` varchar(15) NOT NULL,
  `hospital_address` text,
  `hospital_status` enum('Draft','Pending','Approved','Rejected') NOT NULL DEFAULT 'Draft',
  `hospital_is_active` tinyint(1) DEFAULT '1',
  `hospital_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `hospital_registration_number` varchar(100) DEFAULT NULL,
  `hospital_license_number` varchar(100) DEFAULT NULL,
  `license_issuing_authority` varchar(150) DEFAULT NULL,
  `license_issue_date` date DEFAULT NULL,
  `license_expiry_date` date DEFAULT NULL,
  `license_document` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`hospital_id`),
  UNIQUE KEY `hospital_uid` (`hospital_uid`),
  UNIQUE KEY `hospital_email` (`hospital_email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_lab_report;
CREATE TABLE `tbl_lab_report` (
  `lab_report_id` int NOT NULL AUTO_INCREMENT,
  `record_id` int DEFAULT NULL,
  `hospital_id` int NOT NULL,
  `report_type` varchar(100) NOT NULL,
  `report_title` varchar(150) NOT NULL,
  `report_file` varchar(255) NOT NULL,
  `report_share_flag` tinyint(1) DEFAULT '0',
  `report_is_active` tinyint(1) DEFAULT '1',
  `report_uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `patient_id` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `appointment_id` int DEFAULT NULL,
  `admission_id` int DEFAULT NULL,
  `visit_id` int DEFAULT NULL,
  PRIMARY KEY (`lab_report_id`),
  KEY `fk_report_record` (`record_id`),
  KEY `fk_report_hospital` (`hospital_id`),
  CONSTRAINT `fk_report_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `tbl_hospital` (`hospital_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_report_record` FOREIGN KEY (`record_id`) REFERENCES `tbl_medical_record` (`record_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_medical_record;
CREATE TABLE `tbl_medical_record` (
  `record_id` int NOT NULL AUTO_INCREMENT,
  `visit_id` int NOT NULL,
  `record_diagnosis` text NOT NULL,
  `record_notes` text,
  `record_share_flag` tinyint(1) DEFAULT '0',
  `record_is_active` tinyint(1) DEFAULT '1',
  `record_created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`record_id`),
  UNIQUE KEY `uq_medical_record_visit` (`visit_id`),
  CONSTRAINT `fk_record_visit` FOREIGN KEY (`visit_id`) REFERENCES `tbl_patient_visit` (`visit_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_nurse;
CREATE TABLE `tbl_nurse` (
  `nurse_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `hospital_id` int NOT NULL,
  `department_id` int DEFAULT NULL,
  `nurse_is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`nurse_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_patient;
CREATE TABLE `tbl_patient` (
  `patient_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `patient_uid` varchar(20) NOT NULL,
  `patient_name` varchar(100) NOT NULL,
  `patient_dob` date NOT NULL,
  `patient_gender` enum('Male','Female','Other') NOT NULL,
  `patient_phone` varchar(15) NOT NULL,
  `patient_email` varchar(100) DEFAULT NULL,
  `patient_blood_group` varchar(5) DEFAULT NULL,
  `patient_address` text,
  `patient_emergency_contact` varchar(15) DEFAULT NULL,
  `patient_is_active` tinyint(1) DEFAULT '1',
  `patient_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `allergies` text,
  PRIMARY KEY (`patient_id`),
  UNIQUE KEY `uq_patient_uid` (`patient_uid`),
  UNIQUE KEY `patient_email` (`patient_email`),
  KEY `fk_patient_user` (`user_id`),
  KEY `idx_patient_phone` (`patient_phone`),
  CONSTRAINT `fk_patient_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_patient_profile;
CREATE TABLE `tbl_patient_profile` (
  `patient_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `health_id` varchar(40) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `address` text,
  `patient_is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `allergies` text,
  PRIMARY KEY (`patient_id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `health_id` (`health_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_patient_visit;
CREATE TABLE `tbl_patient_visit` (
  `visit_id` int NOT NULL AUTO_INCREMENT,
  `appointment_id` int DEFAULT NULL,
  `visit_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `visit_is_active` tinyint(1) DEFAULT '1',
  `patient_id` int NOT NULL,
  `doctor_id` int NOT NULL,
  `hospital_id` int NOT NULL,
  `diagnosis` text,
  `medical_notes` text,
  `visited_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `height` varchar(20) DEFAULT NULL,
  `weight` varchar(20) DEFAULT NULL,
  `blood_pressure` varchar(30) DEFAULT NULL,
  `vitals_recorded_by` int DEFAULT NULL,
  `vitals_recorded_at` datetime DEFAULT NULL,
  `record_share_flag` tinyint(1) DEFAULT '1',
  `visit_type` varchar(20) NOT NULL DEFAULT 'OP',
  `admission_id` int DEFAULT NULL,
  PRIMARY KEY (`visit_id`),
  UNIQUE KEY `uq_visit_appointment` (`appointment_id`),
  CONSTRAINT `fk_visit_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `tbl_appointment` (`appointment_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_prescription;
CREATE TABLE `tbl_prescription` (
  `prescription_id` int NOT NULL AUTO_INCREMENT,
  `record_id` int DEFAULT NULL,
  `prescription_date` date NOT NULL,
  `remarks` text,
  `prescription_share_flag` tinyint(1) DEFAULT '1',
  `prescription_is_active` tinyint(1) DEFAULT '1',
  `prescription_created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `patient_id` int DEFAULT NULL,
  `doctor_id` int DEFAULT NULL,
  `hospital_id` int DEFAULT NULL,
  `appointment_id` int DEFAULT NULL,
  `visit_id` int DEFAULT NULL,
  `admission_id` int DEFAULT NULL,
  PRIMARY KEY (`prescription_id`),
  KEY `fk_prescription_record` (`record_id`),
  CONSTRAINT `fk_prescription_record` FOREIGN KEY (`record_id`) REFERENCES `tbl_medical_record` (`record_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_prescription_item;
CREATE TABLE `tbl_prescription_item` (
  `prescription_item_id` int NOT NULL AUTO_INCREMENT,
  `prescription_id` int NOT NULL,
  `medicine_name` varchar(100) NOT NULL,
  `medicine_dosage` varchar(50) NOT NULL,
  `medicine_frequency` varchar(50) NOT NULL,
  `medicine_duration` varchar(50) NOT NULL,
  `medicine_instruction` text,
  PRIMARY KEY (`prescription_item_id`),
  KEY `fk_prescription_item` (`prescription_id`),
  CONSTRAINT `fk_prescription_item` FOREIGN KEY (`prescription_id`) REFERENCES `tbl_prescription` (`prescription_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_receptionist;
CREATE TABLE `tbl_receptionist` (
  `receptionist_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `hospital_id` int NOT NULL,
  `receptionist_is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`receptionist_id`),
  UNIQUE KEY `uq_receptionist_user` (`user_id`),
  KEY `fk_receptionist_hospital` (`hospital_id`),
  CONSTRAINT `fk_receptionist_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `tbl_hospital` (`hospital_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_receptionist_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_user` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_role;
CREATE TABLE `tbl_role` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  `role_is_active` tinyint(1) DEFAULT '1',
  `role_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `role_updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS tbl_user;
CREATE TABLE `tbl_user` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` int DEFAULT NULL,
  `role_id` int NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `user_email` varchar(100) DEFAULT NULL,
  `user_phone` varchar(15) DEFAULT NULL,
  `user_password` varchar(255) NOT NULL,
  `user_is_active` tinyint(1) DEFAULT '1',
  `user_created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `user_updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_recovery_question` varchar(255) DEFAULT NULL,
  `user_recovery_answer` varchar(255) DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `user_email` (`user_email`),
  KEY `fk_user_role` (`role_id`),
  KEY `fk_user_hospital` (`hospital_id`),
  KEY `idx_user_phone` (`user_phone`),
  CONSTRAINT `fk_user_hospital` FOREIGN KEY (`hospital_id`) REFERENCES `tbl_hospital` (`hospital_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_user_role` FOREIGN KEY (`role_id`) REFERENCES `tbl_role` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
