CREATE TABLE "admin_reset_links" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"target_user_id" uuid NOT NULL,
	"minted_by_user_id" uuid,
	"minted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "smtp_host" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "smtp_port" integer DEFAULT 587 NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "smtp_user" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "smtp_password_enc" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "smtp_from" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "smtp_secure" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD COLUMN "smtp_tested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_reset_links" ADD CONSTRAINT "admin_reset_links_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_reset_links" ADD CONSTRAINT "admin_reset_links_minted_by_user_id_user_id_fk" FOREIGN KEY ("minted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_reset_links_target_idx" ON "admin_reset_links" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "admin_reset_links_minted_at_desc" ON "admin_reset_links" USING btree ("minted_at" DESC);--> statement-breakpoint
ALTER TABLE "instance_settings" ADD CONSTRAINT "instance_settings_smtp_port" CHECK ("instance_settings"."smtp_port" BETWEEN 1 AND 65535);