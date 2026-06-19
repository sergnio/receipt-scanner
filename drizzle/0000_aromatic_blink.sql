CREATE TABLE `line_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`receipt_id` integer NOT NULL,
	`product_id` integer,
	`raw_name` text NOT NULL,
	`qty` real,
	`unit` text,
	`unit_price` real,
	`total_price` real,
	`weight_grams` real,
	FOREIGN KEY (`receipt_id`) REFERENCES `receipts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`canonical_name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`default_unit` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_normalized_idx` ON `products` (`normalized_name`);--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vendor_id` integer,
	`purchased_at` integer NOT NULL,
	`currency` text,
	`total` real,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendors_normalized_idx` ON `vendors` (`normalized_name`);