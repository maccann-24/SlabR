CREATE TABLE "escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"original_contact_id" uuid,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"sent_to" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now(),
	"acknowledged" boolean DEFAULT false,
	"acknowledged_at" timestamp with time zone,
	"escalated_to_owner" boolean DEFAULT false,
	"escalated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "on_call_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"role" text DEFAULT 'technician',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "on_call_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_original_contact_id_on_call_contacts_id_fk" FOREIGN KEY ("original_contact_id") REFERENCES "public"."on_call_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "on_call_contacts" ADD CONSTRAINT "on_call_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "on_call_schedule" ADD CONSTRAINT "on_call_schedule_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "on_call_schedule" ADD CONSTRAINT "on_call_schedule_contact_id_on_call_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."on_call_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_escalations_pending" ON "escalations" USING btree ("client_id","acknowledged");--> statement-breakpoint
CREATE INDEX "idx_on_call_contacts_client" ON "on_call_contacts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_on_call_schedule_lookup" ON "on_call_schedule" USING btree ("client_id","day_of_week");