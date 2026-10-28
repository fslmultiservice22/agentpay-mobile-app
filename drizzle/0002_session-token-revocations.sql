CREATE TABLE `session_token_revocations` (
	`tokenHash` varchar(64) NOT NULL,
	`expiresAtMs` bigint unsigned NOT NULL,
	`revokedAt` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `session_token_revocations_tokenHash` PRIMARY KEY(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `session_token_revocations_expires_idx` ON `session_token_revocations` (`expiresAtMs`);