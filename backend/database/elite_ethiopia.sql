-- =============================================================================
-- Elite Ethiopia — MySQL schema (matches Node backend / database/schema.ts)
-- Target: MySQL 8.0+ (uses JSON columns)
-- =============================================================================
-- How to use:
--   mysql -u root -p < backend/database/elite_ethiopia.sql   (from project root; Linux/macOS/Git Bash)
--   cd backend && mysql -u root -p < database/elite_ethiopia.sql
--   Windows PowerShell: Get-Content database\elite_ethiopia.sql | mysql -u root -p
--   Or open this file in MySQL Workbench / phpMyAdmin and execute.
--
-- Then set in backend/.env (or env):
--   MYSQL_HOST=127.0.0.1
--   MYSQL_PORT=3306
--   MYSQL_USER=root
--   MYSQL_PASSWORD=your_password
--   MYSQL_DATABASE=elite_ethiopia
--
-- First API start still runs CREATE IF NOT EXISTS + optional seed users if
-- `users` is empty. If you only want SQL tables (no app seed), leave users
-- empty or insert your own rows.
--
-- Default seed accounts (override in backend/.env before production):
--   Super Admin (founder):  FOUNDER_EMAIL   default founder@eliteethiopia.com
--   Support Admin:          SUPPORT_ADMIN_EMAIL default admin@eliteethiopia.com
--   Passwords: FOUNDER_PASSWORD, SUPPORT_ADMIN_PASSWORD (see backend/env.example)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS elite_ethiopia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE elite_ethiopia;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  google_id VARCHAR(255) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(24) NOT NULL,
  phone VARCHAR(64) NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  bio TEXT NULL,
  skills_json JSON NULL,
  hourly_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  rating DECIMAL(4,2) NOT NULL DEFAULT 0,
  completed_projects INT NOT NULL DEFAULT 0,
  earnings DECIMAL(14,2) NOT NULL DEFAULT 0,
  location VARCHAR(255) NOT NULL DEFAULT '',
  profile_complete INT NOT NULL DEFAULT 30,
  company VARCHAR(255) NOT NULL DEFAULT '',
  industry VARCHAR(255) NOT NULL DEFAULT '',
  verified_payment TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  username VARCHAR(64) NULL UNIQUE,
  national_id VARCHAR(128) NULL,
  id_front_image_url VARCHAR(768) NULL,
  id_back_image_url VARCHAR(768) NULL,
  profile_picture_url VARCHAR(768) NULL,
  short_bio TEXT NULL,
  social_links_json JSON NULL,
  verification_status VARCHAR(24) NOT NULL DEFAULT 'pending',
  paid_verification_badge TINYINT(1) NOT NULL DEFAULT 0,
  wallet_account_no VARCHAR(32) NULL UNIQUE,
  coins INT NOT NULL DEFAULT 0,
  personal_profile_json JSON NULL,
  onboarding_profile_status VARCHAR(16) NOT NULL DEFAULT 'skipped',
  INDEX idx_users_role (role),
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- services
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  freelancer_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(120) NOT NULL DEFAULT 'General',
  price_min DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_max DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_days INT NOT NULL DEFAULT 7,
  image_url VARCHAR(768) NULL,
  tags_json JSON NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_services_freelancer (freelancer_id),
  INDEX idx_services_status (status),
  CONSTRAINT fk_services_user FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- digital_products
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS digital_products (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  creator_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  full_description TEXT NULL,
  promotion_sample_url VARCHAR(768) NULL,
  category VARCHAR(120) NOT NULL DEFAULT 'Digital',
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  image_url VARCHAR(768) NULL,
  images_json JSON NULL,
  file_path VARCHAR(768) NULL,
  downloads_count INT NOT NULL DEFAULT 0,
  rating DECIMAL(4,2) NOT NULL DEFAULT 0,
  sales_count INT NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_products_creator (creator_id),
  CONSTRAINT fk_products_user FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- service_orders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_orders (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  service_id VARCHAR(36) NOT NULL,
  client_id VARCHAR(36) NOT NULL,
  freelancer_id VARCHAR(36) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'confirmed',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(48) NOT NULL DEFAULT 'mock',
  payment_status VARCHAR(24) NOT NULL DEFAULT 'completed',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_so_client (client_id),
  INDEX idx_so_freelancer (freelancer_id),
  CONSTRAINT fk_so_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  CONSTRAINT fk_so_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_so_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- digital_purchases
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS digital_purchases (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL,
  buyer_id VARCHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(48) NOT NULL DEFAULT 'mock',
  payment_status VARCHAR(24) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_dp_buyer (buyer_id),
  CONSTRAINT fk_dp_product FOREIGN KEY (product_id) REFERENCES digital_products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dp_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  ref_type VARCHAR(32) NOT NULL,
  ref_id VARCHAR(36) NOT NULL,
  payer_id VARCHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(48) NOT NULL,
  status VARCHAR(24) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pay_ref (ref_type, ref_id),
  CONSTRAINT fk_pay_user FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- messages
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  sender_id VARCHAR(36) NOT NULL,
  receiver_id VARCHAR(36) NOT NULL,
  body TEXT NOT NULL,
  attachment_storage_path VARCHAR(768) NULL,
  attachment_original_name VARCHAR(255) NULL,
  service_order_id VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_msg_pair (sender_id, receiver_id),
  INDEX idx_msg_pair_rev (receiver_id, sender_id),
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- reviews
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  reviewer_id VARCHAR(36) NOT NULL,
  target_user_id VARCHAR(36) NOT NULL,
  service_order_id VARCHAR(36) NULL,
  rating DECIMAL(3,1) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rev_target (target_user_id),
  CONSTRAINT fk_rev_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- disputes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disputes (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  opened_by VARCHAR(36) NOT NULL,
  respondent_id VARCHAR(36) NOT NULL,
  ref_type VARCHAR(32) NOT NULL,
  ref_id VARCHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'open',
  resolution_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_disp_status (status),
  CONSTRAINT fk_disp_opener FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_disp_resp FOREIGN KEY (respondent_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- wallets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  account_no VARCHAR(32) NOT NULL UNIQUE,
  balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- wallet_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  wallet_id VARCHAR(36) NOT NULL,
  type VARCHAR(24) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  fee_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'completed',
  ref_id VARCHAR(64) NULL,
  meta_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wallet_tx_wallet (wallet_id),
  CONSTRAINT fk_wallet_tx_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(48) NOT NULL DEFAULT 'system',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- coin_wallets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coin_wallets (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  coin_balance INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_coin_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- coin_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coin_transactions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(24) NOT NULL,
  amount INT NOT NULL,
  source VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_coin_tx_user (user_id),
  CONSTRAINT fk_coin_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- jobs (client job posts; open jobs listed for freelancers)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(120) NOT NULL DEFAULT 'General',
  budget_type VARCHAR(24) NOT NULL DEFAULT 'fixed',
  budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  hourly_rate DECIMAL(12,2) NOT NULL DEFAULT 0,
  job_type VARCHAR(24) NOT NULL DEFAULT 'contract',
  deadline DATE NULL,
  duration VARCHAR(120) NULL,
  skills_json JSON NULL,
  visibility VARCHAR(24) NOT NULL DEFAULT 'public',
  freelancers_needed INT NOT NULL DEFAULT 1,
  experience_level VARCHAR(24) NOT NULL DEFAULT 'mid',
  attachments_json JSON NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'draft',
  proposals_count INT NOT NULL DEFAULT 0,
  selected_freelancer_id VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jobs_client (client_id),
  INDEX idx_jobs_status (status),
  INDEX idx_jobs_visibility (visibility),
  CONSTRAINT fk_jobs_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_jobs_selected_freelancer FOREIGN KEY (selected_freelancer_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- job_proposals (freelancer applications to jobs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_proposals (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  freelancer_id VARCHAR(36) NOT NULL,
  bid_amount DECIMAL(12,2) NOT NULL,
  cover_letter TEXT NOT NULL,
  cv_file_name VARCHAR(255) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_job_freelancer (job_id, freelancer_id),
  INDEX idx_jp_job (job_id),
  INDEX idx_jp_freelancer (freelancer_id),
  CONSTRAINT fk_jp_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_jp_freelancer FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- telebirr_accounts (mock Telebirr "external" wallet — simulated provider)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telebirr_accounts (
  phone_number VARCHAR(32) NOT NULL PRIMARY KEY,
  user_id VARCHAR(36) NULL,
  holder_name VARCHAR(255) NOT NULL,
  balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  pin_hash VARCHAR(255) NOT NULL,
  status ENUM('active','frozen') NOT NULL DEFAULT 'active',
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tb_user (user_id),
  CONSTRAINT fk_tb_account_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- telebirr_transactions (mock Telebirr transaction ledger)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telebirr_transactions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  reference_no VARCHAR(32) NOT NULL UNIQUE,
  from_phone VARCHAR(32) NULL,
  to_phone VARCHAR(32) NULL,
  type ENUM('debit','credit','transfer') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  fee DECIMAL(14,2) NOT NULL DEFAULT 0,
  status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
  description VARCHAR(255) NULL,
  external_ref VARCHAR(64) NULL,
  failure_reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_tb_tx_ref (reference_no),
  INDEX idx_tb_tx_from (from_phone),
  INDEX idx_tb_tx_to (to_phone),
  INDEX idx_tb_tx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Optional: dedicated application user (uncomment and change password)
-- =============================================================================
-- CREATE USER IF NOT EXISTS 'elite_app'@'localhost' IDENTIFIED BY 'choose_strong_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON elite_ethiopia.* TO 'elite_app'@'localhost';
-- FLUSH PRIVILEGES;
-- Then use MYSQL_USER=elite_app and MYSQL_PASSWORD=choose_strong_password in .env

-- -----------------------------------------------------------------------------
-- Upgrade: if you created the DB before the marketplace columns existed, run once:
-- -----------------------------------------------------------------------------
-- ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER verified_payment;
-- ALTER TABLE users ADD COLUMN username VARCHAR(64) NULL UNIQUE AFTER is_active;
-- ALTER TABLE users ADD COLUMN national_id VARCHAR(128) NULL AFTER username;
-- ALTER TABLE users ADD COLUMN id_front_image_url VARCHAR(768) NULL AFTER national_id;
-- ALTER TABLE users ADD COLUMN id_back_image_url VARCHAR(768) NULL AFTER id_front_image_url;
-- ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR(768) NULL AFTER id_back_image_url;
-- ALTER TABLE users ADD COLUMN short_bio TEXT NULL AFTER profile_picture_url;
-- ALTER TABLE users ADD COLUMN social_links_json JSON NULL AFTER short_bio;
-- ALTER TABLE users ADD COLUMN verification_status VARCHAR(24) NOT NULL DEFAULT 'pending' AFTER social_links_json;
-- ALTER TABLE users ADD COLUMN paid_verification_badge TINYINT(1) NOT NULL DEFAULT 0 AFTER verification_status;
-- ALTER TABLE users ADD COLUMN wallet_account_no VARCHAR(32) NULL UNIQUE AFTER paid_verification_badge;
-- ALTER TABLE users ADD COLUMN coins INT NOT NULL DEFAULT 0 AFTER wallet_account_no;

-- -----------------------------------------------------------------------------
-- Upgrade: ride/delivery courier system removed — if your DB still has the old table or rider accounts:
-- -----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS delivery_requests;
-- UPDATE users SET role = 'client' WHERE role = 'rider';
