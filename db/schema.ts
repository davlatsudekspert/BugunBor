import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const utcNow = sql`CURRENT_TIMESTAMP`;

export const plans = sqliteTable(
  'plans',
  {
    id: text('id').primaryKey(),
    code: text('code', { enum: ['FREE', 'PRO'] }).notNull(),
    name: text('name').notNull(),
    priceUzs: integer('price_uzs').notNull().default(0),
    billingPeriod: text('billing_period').notNull().default('MONTHLY'),
    description: text('description').notNull().default(''),
    featuresJson: text('features_json').notNull().default('[]'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    updatedById: text('updated_by_id'),
    createdAt: text('created_at').notNull().default(utcNow),
    updatedAt: text('updated_at').notNull().default(utcNow),
  },
  (table) => [uniqueIndex('idx_plans_code').on(table.code)],
);

/**
 * Admin/operator accounts. Deliberately separate from the marketplace `users`
 * table: sign-in is a dedicated phone + Telegram OTP flow (see modules/admin),
 * independent of the customer/business identity source used elsewhere.
 */
export const adminUsers = sqliteTable(
  'admin_users',
  {
    id: text('id').primaryKey(),
    phone: text('phone').notNull(),
    displayName: text('display_name').notNull(),
    role: text('role', { enum: ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'] }).notNull(),
    status: text('status', { enum: ['ACTIVE', 'SUSPENDED'] }).notNull().default('ACTIVE'),
    telegramChatId: text('telegram_chat_id'),
    createdById: text('created_by_id'),
    createdAt: text('created_at').notNull().default(utcNow),
    updatedAt: text('updated_at').notNull().default(utcNow),
  },
  (table) => [uniqueIndex('idx_admin_users_phone').on(table.phone)],
);

export const adminOtpCodes = sqliteTable(
  'admin_otp_codes',
  {
    id: text('id').primaryKey(),
    adminUserId: text('admin_user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: text('consumed_at'),
    createdAt: text('created_at').notNull().default(utcNow),
  },
  (table) => [index('idx_admin_otp_admin_created').on(table.adminUserId, table.createdAt)],
);

export const adminSessions = sqliteTable(
  'admin_sessions',
  {
    id: text('id').primaryKey(),
    adminUserId: text('admin_user_id').notNull().references(() => adminUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    userAgent: text('user_agent'),
    ipHash: text('ip_hash'),
    createdAt: text('created_at').notNull().default(utcNow),
  },
  (table) => [
    uniqueIndex('idx_admin_sessions_token_hash').on(table.tokenHash),
    index('idx_admin_sessions_admin').on(table.adminUserId, table.revokedAt),
  ],
);

/** A record of every marketing message posted to the Telegram announcement channel — see modules/admin/auth and app/admin/(protected)/announcements. */
export const adminAnnouncements = sqliteTable(
  'admin_announcements',
  {
    id: text('id').primaryKey(),
    actorAdminId: text('actor_admin_id').notNull().references(() => adminUsers.id),
    dealId: text('deal_id').references(() => deals.id),
    message: text('message').notNull(),
    status: text('status', { enum: ['SENT', 'FAILED'] }).notNull(),
    error: text('error'),
    telegramMessageId: integer('telegram_message_id'),
    createdAt: text('created_at').notNull().default(utcNow),
  },
  (table) => [index('idx_admin_announcements_created').on(table.createdAt)],
);

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    role: text('role', {
      enum: ['CUSTOMER', 'BUSINESS_OWNER', 'BUSINESS_STAFF', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'],
    }).notNull(),
    phone: text('phone'),
    email: text('email'),
    displayName: text('display_name').notNull(),
    locale: text('locale').notNull().default('uz-Latn'),
    phoneVerifiedAt: text('phone_verified_at'),
    emailVerifiedAt: text('email_verified_at'),
    status: text('status', { enum: ['ACTIVE', 'LOCKED', 'DELETION_REQUESTED', 'DELETED'] }).notNull().default('ACTIVE'),
    createdAt: text('created_at').notNull().default(utcNow),
    updatedAt: text('updated_at').notNull().default(utcNow),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    uniqueIndex('idx_users_phone_unique').on(table.phone),
    uniqueIndex('idx_users_email_unique').on(table.email),
    index('idx_users_role_status').on(table.role, table.status),
  ],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    lastSeenAt: text('last_seen_at').notNull().default(utcNow),
    revokedAt: text('revoked_at'),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    createdAt: text('created_at').notNull().default(utcNow),
  },
  (table) => [uniqueIndex('idx_sessions_token_hash').on(table.tokenHash), index('idx_sessions_user_active').on(table.userId, table.revokedAt)],
);

export const businesses = sqliteTable(
  'businesses',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    city: text('city').notNull(),
    region: text('region'),
    categoryId: text('category_id'),
    phone: text('phone'),
    telegram: text('telegram'),
    website: text('website'),
    logoUrl: text('logo_url'),
    coverUrl: text('cover_url'),
    verificationStatus: text('verification_status', { enum: ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'] }).notNull().default('UNVERIFIED'),
    nfcStoreStatus: text('nfcstore_status', { enum: ['DISCONNECTED', 'PENDING', 'CONNECTED', 'ERROR'] }).notNull().default('DISCONNECTED'),
    planId: text('plan_id').notNull().default('plan_free').references(() => plans.id),
    subscriptionStatus: text('subscription_status', { enum: ['FREE', 'ACTIVE', 'PAST_DUE', 'CANCELED'] }).notNull().default('FREE'),
    ratingBasisPoints: integer('rating_basis_points').notNull().default(0),
    reviewCount: integer('review_count').notNull().default(0),
    createdAt: text('created_at').notNull().default(utcNow),
    updatedAt: text('updated_at').notNull().default(utcNow),
    deletedAt: text('deleted_at'),
  },
  (table) => [uniqueIndex('idx_businesses_slug').on(table.slug), index('idx_businesses_city_verification').on(table.city, table.verificationStatus)],
);

export const businessMembers = sqliteTable(
  'business_members',
  {
    businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['OWNER', 'MANAGER', 'DEAL_EDITOR', 'REDEMPTION_STAFF', 'ANALYST'] }).notNull(),
    permissionsJson: text('permissions_json').notNull().default('[]'),
    createdAt: text('created_at').notNull().default(utcNow),
    revokedAt: text('revoked_at'),
  },
  (table) => [primaryKey({ columns: [table.businessId, table.userId] }), index('idx_business_members_user').on(table.userId, table.revokedAt)],
);

export const branches = sqliteTable(
  'branches',
  {
    id: text('id').primaryKey(),
    businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    city: text('city').notNull(),
    region: text('region'),
    address: text('address').notNull(),
    latitudeE6: integer('latitude_e6').notNull(),
    longitudeE6: integer('longitude_e6').notNull(),
    phone: text('phone'),
    workingHoursJson: text('working_hours_json').notNull().default('{}'),
    createdAt: text('created_at').notNull().default(utcNow),
    updatedAt: text('updated_at').notNull().default(utcNow),
    deletedAt: text('deleted_at'),
  },
  (table) => [index('idx_branches_business').on(table.businessId, table.deletedAt), index('idx_branches_city').on(table.city)],
);

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    parentId: text('parent_id'),
    slug: text('slug').notNull(),
    nameUz: text('name_uz').notNull(),
    nameRu: text('name_ru'),
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => [uniqueIndex('idx_categories_slug').on(table.slug), index('idx_categories_parent_order').on(table.parentId, table.sortOrder)],
);

export const deals = sqliteTable(
  'deals',
  {
    id: text('id').primaryKey(),
    businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'restrict' }),
    categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    terms: text('terms').notNull(),
    listingType: text('listing_type', { enum: ['PRODUCT', 'SERVICE'] }).notNull().default('PRODUCT'),
    originalPriceUzs: integer('original_price_uzs'),
    discountedPriceUzs: integer('discounted_price_uzs').notNull(),
    discountPercent: integer('discount_percent').notNull(),
    minPriceUzs: integer('min_price_uzs'),
    startsAt: text('starts_at').notNull(),
    endsAt: text('ends_at').notNull(),
    totalQuantity: integer('total_quantity'),
    remainingQuantity: integer('remaining_quantity'),
    perCustomerLimit: integer('per_customer_limit').notNull().default(1),
    redemptionMethod: text('redemption_method', { enum: ['ONSITE_CODE', 'ONLINE_VOUCHER'] }).notNull(),
    status: text('status', { enum: ['DRAFT', 'PENDING_REVIEW', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'EXPIRED', 'REJECTED', 'ARCHIVED'] }).notNull().default('DRAFT'),
    imageUrl: text('image_url'),
    isSponsored: integer('is_sponsored', { mode: 'boolean' }).notNull().default(false),
    createdById: text('created_by_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: text('created_at').notNull().default(utcNow),
    updatedAt: text('updated_at').notNull().default(utcNow),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    uniqueIndex('idx_deals_business_slug').on(table.businessId, table.slug),
    index('idx_deals_public_window').on(table.status, table.startsAt, table.endsAt),
    index('idx_deals_category_status').on(table.categoryId, table.status),
    index('idx_deals_business_status').on(table.businessId, table.status),
  ],
);

export const dealBranches = sqliteTable(
  'deal_branches',
  {
    dealId: text('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
    branchId: text('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    capacity: integer('capacity'),
  },
  (table) => [primaryKey({ columns: [table.dealId, table.branchId] }), index('idx_deal_branches_branch').on(table.branchId)],
);

export const favorites = sqliteTable(
  'favorites',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    dealId: text('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').notNull().default(utcNow),
  },
  (table) => [primaryKey({ columns: [table.userId, table.dealId] }), index('idx_favorites_deal').on(table.dealId)],
);

export const redemptions = sqliteTable(
  'redemptions',
  {
    id: text('id').primaryKey(),
    dealId: text('deal_id').notNull().references(() => deals.id, { onDelete: 'restrict' }),
    branchId: text('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    idempotencyKey: text('idempotency_key').notNull(),
    codeHash: text('code_hash').notNull(),
    codeHint: text('code_hint').notNull(),
    status: text('status', { enum: ['CLAIMED', 'COMPLETED', 'CANCELED', 'EXPIRED'] }).notNull().default('CLAIMED'),
    expiresAt: text('expires_at').notNull(),
    completedAt: text('completed_at'),
    timeSlotId: text('time_slot_id').references(() => dealTimeSlots.id),
    promoCodeId: text('promo_code_id').references(() => promoCodes.id),
    finalPriceUzs: integer('final_price_uzs'),
    createdAt: text('created_at').notNull().default(utcNow),
  },
  (table) => [
    uniqueIndex('idx_redemptions_idempotency').on(table.idempotencyKey),
    uniqueIndex('idx_redemptions_code_hash').on(table.codeHash),
    index('idx_redemptions_user_created').on(table.userId, table.createdAt),
    index('idx_redemptions_deal_status').on(table.dealId, table.status),
  ],
);

/** A review requires owning a COMPLETED redemption (redemptionId is UNIQUE) — no review without a real, staff-confirmed visit. */
export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    redemptionId: text('redemption_id').notNull().unique().references(() => redemptions.id),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: text('created_at').notNull().default(utcNow),
  },
  (table) => [index('idx_reviews_business').on(table.businessId, table.createdAt)],
);

export const promoCodes = sqliteTable('promo_codes', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type', { enum: ['PERCENT', 'FIXED'] }).notNull(),
  discountValue: integer('discount_value').notNull(),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').notNull().default(0),
  expiresAt: text('expires_at'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdByAdminId: text('created_by_admin_id'),
  createdAt: text('created_at').notNull().default(utcNow),
});

export const promoCodeRedemptions = sqliteTable(
  'promo_code_redemptions',
  {
    promoCodeId: text('promo_code_id').notNull().references(() => promoCodes.id),
    userId: text('user_id').notNull().references(() => users.id),
    redemptionId: text('redemption_id').notNull().unique().references(() => redemptions.id),
    createdAt: text('created_at').notNull().default(utcNow),
  },
  (table) => [primaryKey({ columns: [table.promoCodeId, table.userId] })],
);

/** "Auto Skidka": time-boxed discount steps for one deal — see syncAutoDiscountTiers() in db/runtime.ts. */
export const dealDiscountTiers = sqliteTable(
  'deal_discount_tiers',
  {
    id: text('id').primaryKey(),
    dealId: text('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
    startsAt: text('starts_at').notNull(),
    endsAt: text('ends_at').notNull(),
    discountPercent: integer('discount_percent').notNull(),
  },
  (table) => [index('idx_deal_discount_tiers_deal').on(table.dealId, table.startsAt)],
);

/** Time-slot booking for services — a deal with rows here is booked by slot instead of by a flat quantity counter. */
export const dealTimeSlots = sqliteTable(
  'deal_time_slots',
  {
    id: text('id').primaryKey(),
    dealId: text('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
    startsAt: text('starts_at').notNull(),
    capacity: integer('capacity').notNull(),
    remainingCapacity: integer('remaining_capacity').notNull(),
    createdAt: text('created_at').notNull().default(utcNow),
  },
  (table) => [index('idx_deal_time_slots_deal').on(table.dealId, table.startsAt)],
);

/** A marketplace session minted after verifyTelegramInitData() confirms a Telegram Mini App
 * visitor's initData — same hashed-token pattern as adminSessions, for a `users` row instead. */
export const telegramSessions = sqliteTable(
  'telegram_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    telegramUserId: text('telegram_user_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    createdAt: text('created_at').notNull().default(utcNow),
  },
  (table) => [
    uniqueIndex('idx_telegram_sessions_token_hash').on(table.tokenHash),
    index('idx_telegram_sessions_user').on(table.userId, table.revokedAt),
  ],
);

/** Every "Bog'lanish" submission and AI Yordamchi lead — see /admin/support. */
export const supportTickets = sqliteTable(
  'support_tickets',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    subject: text('subject').notNull(),
    message: text('message').notNull(),
    source: text('source', { enum: ['CONTACT_FORM', 'AI_ASSISTANT'] }).notNull().default('CONTACT_FORM'),
    status: text('status', { enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'] }).notNull().default('OPEN'),
    resolvedByAdminId: text('resolved_by_admin_id'),
    resolutionNote: text('resolution_note'),
    createdAt: text('created_at').notNull().default(utcNow),
    updatedAt: text('updated_at').notNull().default(utcNow),
  },
  (table) => [index('idx_support_tickets_status').on(table.status, table.createdAt)],
);

export const redemptionEvents = sqliteTable(
  'redemption_events',
  {
    id: text('id').primaryKey(),
    redemptionId: text('redemption_id').notNull().references(() => redemptions.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    type: text('type', { enum: ['CLAIMED', 'VALIDATION_ATTEMPTED', 'COMPLETED', 'REJECTED', 'CANCELED', 'EXPIRED'] }).notNull(),
    metadataJson: text('metadata_json').notNull().default('{}'),
    createdAt: text('created_at').notNull().default(utcNow),
  },
  (table) => [index('idx_redemption_events_redemption').on(table.redemptionId, table.createdAt)],
);

export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  balanceBb: integer('balance_bb').notNull().default(0),
  ledgerVersion: integer('ledger_version').notNull().default(0),
  createdAt: text('created_at').notNull().default(utcNow),
  updatedAt: text('updated_at').notNull().default(utcNow),
}, (table) => [uniqueIndex('idx_wallets_user').on(table.userId)]);

export const walletLedgerEntries = sqliteTable('wallet_ledger_entries', {
  id: text('id').primaryKey(),
  walletId: text('wallet_id').notNull().references(() => wallets.id, { onDelete: 'restrict' }),
  type: text('type').notNull(),
  amountBb: integer('amount_bb').notNull(),
  balanceAfterBb: integer('balance_after_bb').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  reason: text('reason'),
  expiresAt: text('expires_at'),
  reversalOfId: text('reversal_of_id'),
  createdAt: text('created_at').notNull().default(utcNow),
}, (table) => [uniqueIndex('idx_wallet_ledger_idempotency').on(table.idempotencyKey), index('idx_wallet_ledger_wallet_created').on(table.walletId, table.createdAt)]);

export const moderationActions = sqliteTable('moderation_actions', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  action: text('action').notNull(),
  reason: text('reason').notNull(),
  beforeJson: text('before_json').notNull(),
  afterJson: text('after_json').notNull(),
  createdAt: text('created_at').notNull().default(utcNow),
}, (table) => [index('idx_moderation_target').on(table.targetType, table.targetId, table.createdAt)]);

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  businessId: text('business_id').references(() => businesses.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  reason: text('reason'),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  ipHash: text('ip_hash'),
  createdAt: text('created_at').notNull().default(utcNow),
}, (table) => [index('idx_audit_business_created').on(table.businessId, table.createdAt), index('idx_audit_target').on(table.targetType, table.targetId)]);

export const webhookEvents = sqliteTable('webhook_events', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  externalEventId: text('external_event_id').notNull(),
  payloadHash: text('payload_hash').notNull(),
  status: text('status', { enum: ['RECEIVED', 'PROCESSED', 'FAILED', 'DEAD_LETTER'] }).notNull().default('RECEIVED'),
  attempts: integer('attempts').notNull().default(0),
  receivedAt: text('received_at').notNull().default(utcNow),
  processedAt: text('processed_at'),
}, (table) => [uniqueIndex('idx_webhooks_provider_event').on(table.provider, table.externalEventId), index('idx_webhooks_status_received').on(table.status, table.receivedAt)]);

export const externalAccountMappings = sqliteTable('external_account_mappings', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  externalUserId: text('external_user_id'),
  externalBusinessId: text('external_business_id'),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  businessId: text('business_id').references(() => businesses.id, { onDelete: 'cascade' }),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  membership: text('membership'),
  cardStatus: text('card_status'),
  createdAt: text('created_at').notNull().default(utcNow),
}, (table) => [uniqueIndex('idx_external_user').on(table.provider, table.externalUserId), uniqueIndex('idx_external_business').on(table.provider, table.externalBusinessId)]);

export const nfcDeviceMappings = sqliteTable('nfc_device_mappings', {
  id: text('id').primaryKey(),
  tokenHash: text('token_hash').notNull(),
  businessId: text('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  branchId: text('branch_id').references(() => branches.id, { onDelete: 'set null' }),
  status: text('status', { enum: ['ACTIVE', 'PAUSED', 'REVOKED'] }).notNull().default('ACTIVE'),
  createdAt: text('created_at').notNull().default(utcNow),
}, (table) => [uniqueIndex('idx_nfc_token_hash').on(table.tokenHash), index('idx_nfc_business_status').on(table.businessId, table.status)]);

export const nfcTapEvents = sqliteTable('nfc_tap_events', {
  id: text('id').primaryKey(),
  deviceMappingId: text('device_mapping_id').notNull().references(() => nfcDeviceMappings.id, { onDelete: 'restrict' }),
  anonymousVisitorHash: text('anonymous_visitor_hash'),
  referrerHost: text('referrer_host'),
  createdAt: text('created_at').notNull().default(utcNow),
}, (table) => [index('idx_nfc_taps_mapping_created').on(table.deviceMappingId, table.createdAt)]);
