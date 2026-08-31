PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('CUSTOMER','BUSINESS_OWNER','BUSINESS_STAFF','MODERATOR','ADMIN','SUPER_ADMIN')),
  phone TEXT,
  email TEXT,
  display_name TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'uz-Latn',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users(phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  parent_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  name_uz TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  FOREIGN KEY(parent_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  city TEXT NOT NULL,
  category_id TEXT,
  phone TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  rating_basis_points INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);
CREATE INDEX IF NOT EXISTS idx_businesses_city_verification ON businesses(city, verification_status);

CREATE TABLE IF NOT EXISTS business_members (
  business_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  permissions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  PRIMARY KEY(business_id, user_id),
  FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_business_members_user ON business_members(user_id, revoked_at);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude_e6 INTEGER NOT NULL,
  longitude_e6 INTEGER NOT NULL,
  phone TEXT,
  working_hours_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_branches_business ON branches(business_id, deleted_at);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  terms TEXT NOT NULL,
  original_price_uzs INTEGER,
  discounted_price_uzs INTEGER NOT NULL CHECK (discounted_price_uzs >= 0),
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 0 AND 100),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  total_quantity INTEGER,
  remaining_quantity INTEGER CHECK (remaining_quantity IS NULL OR remaining_quantity >= 0),
  per_customer_limit INTEGER NOT NULL DEFAULT 1 CHECK (per_customer_limit > 0),
  redemption_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  is_sponsored INTEGER NOT NULL DEFAULT 0 CHECK (is_sponsored IN (0,1)),
  created_by_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  UNIQUE(business_id, slug),
  CHECK(ends_at > starts_at),
  FOREIGN KEY(business_id) REFERENCES businesses(id),
  FOREIGN KEY(category_id) REFERENCES categories(id),
  FOREIGN KEY(created_by_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_deals_public_window ON deals(status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_deals_category_status ON deals(category_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_business_status ON deals(business_id, status);

CREATE TABLE IF NOT EXISTS deal_branches (
  deal_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  capacity INTEGER,
  PRIMARY KEY(deal_id, branch_id),
  FOREIGN KEY(deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  FOREIGN KEY(branch_id) REFERENCES branches(id)
);

CREATE TABLE IF NOT EXISTS redemptions (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  code_hash TEXT NOT NULL UNIQUE,
  code_hint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CLAIMED',
  expires_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(deal_id) REFERENCES deals(id),
  FOREIGN KEY(branch_id) REFERENCES branches(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_redemptions_deal_status ON redemptions(deal_id, status);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_created ON redemptions(user_id, created_at);

CREATE TABLE IF NOT EXISTS redemption_events (
  id TEXT PRIMARY KEY,
  redemption_id TEXT NOT NULL,
  actor_user_id TEXT,
  type TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(redemption_id) REFERENCES redemptions(id) ON DELETE CASCADE,
  FOREIGN KEY(actor_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(actor_user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_moderation_target ON moderation_actions(target_type, target_id, created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  business_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  before_json TEXT,
  after_json TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(actor_user_id) REFERENCES users(id),
  FOREIGN KEY(business_id) REFERENCES businesses(id)
);
CREATE INDEX IF NOT EXISTS idx_audit_business_created ON audit_logs(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_logs(target_type, target_id);

PRAGMA optimize;
