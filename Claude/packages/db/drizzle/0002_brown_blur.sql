ALTER TABLE "appointments" ADD COLUMN "duration_minutes" integer DEFAULT 60;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "urgency" text DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "customer_notes" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "special_instructions" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "brief" jsonb;