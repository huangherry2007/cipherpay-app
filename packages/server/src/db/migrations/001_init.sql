/* ============================================================================
   CipherPay Server – MySQL schema (InnoDB, utf8mb4)
   ============================================================================ */
CREATE DATABASE IF NOT EXISTS `cipherpay_server`
  /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */;
USE `cipherpay_server`;

CREATE TABLE IF NOT EXISTS `users` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `owner_cipherpay_pub_key` VARCHAR(66) NOT NULL,
  `owner_curve_pub_x` VARCHAR(66) NULL,
  `owner_curve_pub_y` VARCHAR(66) NULL,
  `note_enc_pub_key` VARCHAR(128) NULL,
  `auth_pub_x`      VARCHAR(256)    NOT NULL,
  `auth_pub_y`      VARCHAR(256)    NOT NULL,
  `username`        VARCHAR(32)     NOT NULL,
  `avatar_url`      VARCHAR(256)    NULL,
  `solana_wallet_address` VARCHAR(44) NULL,
  `created_at`      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_owner_key` (`owner_cipherpay_pub_key`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `ix_users_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_wallets` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `chain`      VARCHAR(16)     NOT NULL,     -- e.g. 'solana', 'ethereum', 'bitcoin'
  `address`    VARCHAR(128)    NOT NULL,     -- base58 (Solana), 0x.. (EVM), bech32, etc.
  `label`      VARCHAR(64)     NULL,         -- 'Main', 'Ledger', etc.
  `is_primary` TINYINT(1)      NOT NULL DEFAULT 0,
  `verified`   TINYINT(1)      NOT NULL DEFAULT 0,  -- set true after signature check
  `created_at` TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_user_wallets_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uq_user_wallets_user_chain_addr` (`user_id`,`chain`,`address`),
  KEY `ix_user_wallets_user_chain` (`user_id`,`chain`),
  KEY `ix_user_wallets_primary` (`user_id`,`is_primary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `nonce`       VARCHAR(96)     NOT NULL,
  `created_at`  TIMESTAMP(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`  TIMESTAMP(0)     NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_sessions_user_id` (`user_id`),
  KEY `ix_sessions_expires_at` (`expires_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `messages` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recipient_key`  VARCHAR(66)     NOT NULL,
  `sender_key`     VARCHAR(66)     NULL,
  `ciphertext`     LONGBLOB        NOT NULL,
  `ciphertext_audit` LONGBLOB      NULL,  -- NEW: sender-encrypted audit receipt
  `kind`           VARCHAR(24)     NOT NULL,
  `amount`         VARCHAR(78)     NULL,  -- Amount in lamports as string (unencrypted, for easy access)
  `content_hash`   VARCHAR(66)     NOT NULL,
  `commitment_hex` VARCHAR(64)     NULL,  -- For deposits: commitment (NULL for transfers/withdraws)
  `nullifier_hex`  VARCHAR(64)     NULL,  -- For transfers/withdraws: nullifier (NULL for deposits)
  `tx_signature`   VARCHAR(88)     NULL,   -- Transaction signature (updated by event listener)
  `created_at`     TIMESTAMP(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at`        TIMESTAMP(0)     NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_messages_content_hash` (`content_hash`),
  KEY `ix_messages_recipient_created` (`recipient_key`, `created_at` DESC),
  KEY `ix_messages_sender_created` (`sender_key`, `created_at` DESC),
  KEY `ix_messages_read_at` (`read_at`),
  KEY `ix_messages_commitment_hex` (`commitment_hex`),
  KEY `ix_messages_nullifier_hex` (`nullifier_hex`),
  KEY `ix_messages_tx_signature` (`tx_signature`),
  KEY `ix_messages_amount` (`amount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tx` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `chain`         VARCHAR(16)     NOT NULL DEFAULT 'solana',
  `commitment`    VARCHAR(66)     NOT NULL,
  `leaf_index`    INT UNSIGNED    NOT NULL,
  `merkle_root`   VARCHAR(66)     NOT NULL,
  `signature`     VARCHAR(120)    NULL,
  `event`         VARCHAR(24)     NOT NULL,
  `nullifier_hex` VARCHAR(64)     NULL,  -- Nullifier extracted from transaction
  `timestamp`     TIMESTAMP(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_tx_commitment` (`commitment`),
  KEY `ix_tx_leaf_index` (`leaf_index`),
  KEY `ix_tx_event_time` (`event`, `timestamp` DESC),
  KEY `ix_tx_nullifier` (`nullifier_hex`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `contacts` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    BIGINT UNSIGNED NOT NULL,
  `alias`      VARCHAR(64)     NOT NULL,
  `peer_key`   VARCHAR(66)     NOT NULL,
  `created_at` TIMESTAMP(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_contacts_user_id` (`user_id`),
  UNIQUE KEY `uq_contacts_user_peer` (`user_id`, `peer_key`),
  CONSTRAINT `fk_contacts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `api_keys` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `api_key`    VARCHAR(100)    NOT NULL,
  `tenant`     VARCHAR(64)     NOT NULL,
  `disabled`   TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_api_keys_key` (`api_key`),
  KEY `ix_api_keys_tenant` (`tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_atas` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     BIGINT UNSIGNED NOT NULL,
  `token_mint`  VARCHAR(44)     NOT NULL,
  `ata_address` VARCHAR(44)     NOT NULL,
  `created_at`  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_user_atas_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uq_user_atas_user_token` (`user_id`, `token_mint`),
  KEY `ix_user_atas_user_id` (`user_id`),
  KEY `ix_user_atas_user_token` (`user_id`, `token_mint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nullifiers table: tracks which notes have been spent (on-chain source of truth)
CREATE TABLE IF NOT EXISTS `nullifiers` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nullifier`     BINARY(32)      NOT NULL,     -- 32-byte nullifier (little-endian)
  `nullifier_hex` CHAR(64)        NOT NULL,     -- hex representation for queries
  `pda_address`    VARCHAR(44)     NOT NULL,     -- Solana PDA address for this nullifier
  `used`           TINYINT(1)      NOT NULL DEFAULT 0,  -- true if spent on-chain
  `tx_signature`   VARCHAR(88)     NULL,         -- Solana transaction signature that spent it
  `event_type`     VARCHAR(24)     NULL,         -- 'transfer' or 'withdraw'
  `spent_at`       TIMESTAMP(0)    NULL,         -- when it was spent (from on-chain)
  `synced_at`      TIMESTAMP(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- last sync time
  `created_at`     TIMESTAMP(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP(0)    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_nullifiers_nullifier` (`nullifier_hex`),
  UNIQUE KEY `uq_nullifiers_pda` (`pda_address`),
  KEY `ix_nullifiers_used` (`used`),
  KEY `ix_nullifiers_synced` (`synced_at`),
  KEY `ix_nullifiers_tx` (`tx_signature`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
