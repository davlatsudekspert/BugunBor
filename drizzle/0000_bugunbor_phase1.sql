CREATE TABLE `admin_announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_admin_id` text NOT NULL,
	`deal_id` text,
	`message` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`telegram_message_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_admin_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_admin_announcements_created` ON `admin_announcements` (`created_at`);--> statement-breakpoint
CREATE TABLE `admin_otp_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_admin_otp_admin_created` ON `admin_otp_codes` (`admin_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`user_agent` text,
	`ip_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_admin_sessions_token_hash` ON `admin_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_admin_sessions_admin` ON `admin_sessions` (`admin_user_id`,`revoked_at`);--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`telegram_chat_id` text,
	`created_by_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_admin_users_phone` ON `admin_users` (`phone`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`business_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text,
	`before_json` text,
	`after_json` text,
	`ip_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_audit_business_created` ON `audit_logs` (`business_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_target` ON `audit_logs` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`region` text,
	`address` text NOT NULL,
	`latitude_e6` integer NOT NULL,
	`longitude_e6` integer NOT NULL,
	`phone` text,
	`working_hours_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_branches_business` ON `branches` (`business_id`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_branches_city` ON `branches` (`city`);--> statement-breakpoint
CREATE TABLE `business_members` (
	`business_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`permissions_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text,
	PRIMARY KEY(`business_id`, `user_id`),
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_business_members_user` ON `business_members` (`user_id`,`revoked_at`);--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`city` text NOT NULL,
	`region` text,
	`category_id` text,
	`phone` text,
	`telegram` text,
	`website` text,
	`logo_url` text,
	`cover_url` text,
	`verification_status` text DEFAULT 'UNVERIFIED' NOT NULL,
	`nfcstore_status` text DEFAULT 'DISCONNECTED' NOT NULL,
	`plan_id` text DEFAULT 'plan_free' NOT NULL,
	`subscription_status` text DEFAULT 'FREE' NOT NULL,
	`rating_basis_points` integer DEFAULT 0 NOT NULL,
	`review_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_businesses_slug` ON `businesses` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_businesses_city_verification` ON `businesses` (`city`,`verification_status`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`slug` text NOT NULL,
	`name_uz` text NOT NULL,
	`name_ru` text,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_categories_slug` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_categories_parent_order` ON `categories` (`parent_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `deal_branches` (
	`deal_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`capacity` integer,
	PRIMARY KEY(`deal_id`, `branch_id`),
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_deal_branches_branch` ON `deal_branches` (`branch_id`);--> statement-breakpoint
CREATE TABLE `deal_discount_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`deal_id` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`discount_percent` integer NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_deal_discount_tiers_deal` ON `deal_discount_tiers` (`deal_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `deal_time_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`deal_id` text NOT NULL,
	`starts_at` text NOT NULL,
	`capacity` integer NOT NULL,
	`remaining_capacity` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_deal_time_slots_deal` ON `deal_time_slots` (`deal_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `deals` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`category_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`terms` text NOT NULL,
	`listing_type` text DEFAULT 'PRODUCT' NOT NULL,
	`original_price_uzs` integer,
	`discounted_price_uzs` integer NOT NULL,
	`discount_percent` integer NOT NULL,
	`min_price_uzs` integer,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`total_quantity` integer,
	`remaining_quantity` integer,
	`per_customer_limit` integer DEFAULT 1 NOT NULL,
	`redemption_method` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`image_url` text,
	`is_sponsored` integer DEFAULT false NOT NULL,
	`created_by_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_deals_business_slug` ON `deals` (`business_id`,`slug`);--> statement-breakpoint
CREATE INDEX `idx_deals_public_window` ON `deals` (`status`,`starts_at`,`ends_at`);--> statement-breakpoint
CREATE INDEX `idx_deals_category_status` ON `deals` (`category_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_deals_business_status` ON `deals` (`business_id`,`status`);--> statement-breakpoint
CREATE TABLE `external_account_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`external_user_id` text,
	`external_business_id` text,
	`user_id` text,
	`business_id` text,
	`verified` integer DEFAULT false NOT NULL,
	`membership` text,
	`card_status` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_external_user` ON `external_account_mappings` (`provider`,`external_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_external_business` ON `external_account_mappings` (`provider`,`external_business_id`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`user_id` text NOT NULL,
	`deal_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`user_id`, `deal_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_favorites_deal` ON `favorites` (`deal_id`);--> statement-breakpoint
CREATE TABLE `moderation_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`action` text NOT NULL,
	`reason` text NOT NULL,
	`before_json` text NOT NULL,
	`after_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_moderation_target` ON `moderation_actions` (`target_type`,`target_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `nfc_device_mappings` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`business_id` text NOT NULL,
	`branch_id` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_nfc_token_hash` ON `nfc_device_mappings` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_nfc_business_status` ON `nfc_device_mappings` (`business_id`,`status`);--> statement-breakpoint
CREATE TABLE `nfc_tap_events` (
	`id` text PRIMARY KEY NOT NULL,
	`device_mapping_id` text NOT NULL,
	`anonymous_visitor_hash` text,
	`referrer_host` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`device_mapping_id`) REFERENCES `nfc_device_mappings`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_nfc_taps_mapping_created` ON `nfc_tap_events` (`device_mapping_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`price_uzs` integer DEFAULT 0 NOT NULL,
	`billing_period` text DEFAULT 'MONTHLY' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`features_json` text DEFAULT '[]' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`updated_by_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_plans_code` ON `plans` (`code`);--> statement-breakpoint
CREATE TABLE `promo_code_redemptions` (
	`promo_code_id` text NOT NULL,
	`user_id` text NOT NULL,
	`redemption_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`promo_code_id`, `user_id`),
	FOREIGN KEY (`promo_code_id`) REFERENCES `promo_codes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`redemption_id`) REFERENCES `redemptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promo_code_redemptions_redemption_id_unique` ON `promo_code_redemptions` (`redemption_id`);--> statement-breakpoint
CREATE TABLE `promo_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`discount_type` text NOT NULL,
	`discount_value` integer NOT NULL,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`expires_at` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by_admin_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `promo_codes_code_unique` ON `promo_codes` (`code`);--> statement-breakpoint
CREATE TABLE `redemption_events` (
	`id` text PRIMARY KEY NOT NULL,
	`redemption_id` text NOT NULL,
	`actor_user_id` text,
	`type` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`redemption_id`) REFERENCES `redemptions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_redemption_events_redemption` ON `redemption_events` (`redemption_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`deal_id` text NOT NULL,
	`branch_id` text NOT NULL,
	`user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`code_hash` text NOT NULL,
	`code_hint` text NOT NULL,
	`status` text DEFAULT 'CLAIMED' NOT NULL,
	`expires_at` text NOT NULL,
	`completed_at` text,
	`time_slot_id` text,
	`promo_code_id` text,
	`final_price_uzs` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`time_slot_id`) REFERENCES `deal_time_slots`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`promo_code_id`) REFERENCES `promo_codes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_redemptions_idempotency` ON `redemptions` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_redemptions_code_hash` ON `redemptions` (`code_hash`);--> statement-breakpoint
CREATE INDEX `idx_redemptions_user_created` ON `redemptions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_redemptions_deal_status` ON `redemptions` (`deal_id`,`status`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`user_id` text NOT NULL,
	`redemption_id` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`redemption_id`) REFERENCES `redemptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_redemption_id_unique` ON `reviews` (`redemption_id`);--> statement-breakpoint
CREATE INDEX `idx_reviews_business` ON `reviews` (`business_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`revoked_at` text,
	`ip_hash` text,
	`user_agent` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sessions_token_hash` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user_active` ON `sessions` (`user_id`,`revoked_at`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`source` text DEFAULT 'CONTACT_FORM' NOT NULL,
	`status` text DEFAULT 'OPEN' NOT NULL,
	`resolved_by_admin_id` text,
	`resolution_note` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_support_tickets_status` ON `support_tickets` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `telegram_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`telegram_user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_telegram_sessions_token_hash` ON `telegram_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_telegram_sessions_user` ON `telegram_sessions` (`user_id`,`revoked_at`);--> statement-breakpoint
CREATE TABLE `user_otp_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_otp_user_created` ON `user_otp_codes` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`phone` text,
	`email` text,
	`display_name` text NOT NULL,
	`locale` text DEFAULT 'uz-Latn' NOT NULL,
	`phone_verified_at` text,
	`email_verified_at` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`telegram_chat_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_phone_unique` ON `users` (`phone`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_telegram_chat_id` ON `users` (`telegram_chat_id`);--> statement-breakpoint
CREATE INDEX `idx_users_role_status` ON `users` (`role`,`status`);--> statement-breakpoint
CREATE TABLE `wallet_ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_id` text NOT NULL,
	`type` text NOT NULL,
	`amount_bb` integer NOT NULL,
	`balance_after_bb` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	`reason` text,
	`expires_at` text,
	`reversal_of_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`wallet_id`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_wallet_ledger_idempotency` ON `wallet_ledger_entries` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_wallet_ledger_wallet_created` ON `wallet_ledger_entries` (`wallet_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`balance_bb` integer DEFAULT 0 NOT NULL,
	`ledger_version` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_wallets_user` ON `wallets` (`user_id`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`external_event_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`status` text DEFAULT 'RECEIVED' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`received_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_webhooks_provider_event` ON `webhook_events` (`provider`,`external_event_id`);--> statement-breakpoint
CREATE INDEX `idx_webhooks_status_received` ON `webhook_events` (`status`,`received_at`);