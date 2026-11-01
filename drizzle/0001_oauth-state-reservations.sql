CREATE TABLE `oauth_state_reservations` (
	`stateHash` varchar(64) NOT NULL,
	`status` enum('reserved','consumed') NOT NULL,
	`reservationId` varchar(64),
	`expiresAtMs` bigint unsigned NOT NULL,
	`reservedAt` timestamp(3) NOT NULL DEFAULT (now()),
	`consumedAt` timestamp(3),
	CONSTRAINT `oauth_state_reservations_stateHash` PRIMARY KEY(`stateHash`)
);
--> statement-breakpoint
CREATE INDEX `oauth_state_reservations_expires_idx` ON `oauth_state_reservations` (`expiresAtMs`);
