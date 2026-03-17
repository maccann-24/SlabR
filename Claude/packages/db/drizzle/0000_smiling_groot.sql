CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"lead_id" uuid,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_address" text,
	"issue_description" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"google_event_id" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"lead_id" uuid,
	"caller_phone" text NOT NULL,
	"twilio_call_sid" text NOT NULL,
	"status" text NOT NULL,
	"duration_seconds" integer,
	"ai_summary" text,
	"recording_url" text,
	"emergency_escalated" boolean DEFAULT false,
	"appointment_booked" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "calls_twilio_call_sid_unique" UNIQUE("twilio_call_sid")
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_name" text NOT NULL,
	"owner_phone" text NOT NULL,
	"owner_email" text,
	"twilio_phone" text NOT NULL,
	"forward_phone" text NOT NULL,
	"business_hours" jsonb NOT NULL,
	"services" text[] NOT NULL,
	"service_area" text NOT NULL,
	"avg_ticket_value" numeric DEFAULT '350',
	"google_place_id" text,
	"google_review_link" text,
	"google_calendar_id" text,
	"recording_consent_required" boolean DEFAULT true,
	"ai_system_prompt" text,
	"plan" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"dashboard_pin" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"pilot_ends_at" timestamp with time zone,
	"guarantee_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "clients_slug_unique" UNIQUE("slug"),
	CONSTRAINT "clients_twilio_phone_unique" UNIQUE("twilio_phone")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"lead_id" uuid,
	"contact_phone" text NOT NULL,
	"direction" text NOT NULL,
	"channel" text NOT NULL,
	"body" text NOT NULL,
	"twilio_sid" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "geo_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"audit_type" text NOT NULL,
	"score" numeric,
	"findings" jsonb,
	"recommendations" jsonb,
	"report_url" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "google_oauth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_type" text DEFAULT 'Bearer',
	"scope" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "google_oauth_tokens_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"contact_name" text,
	"contact_phone" text NOT NULL,
	"contact_address" text,
	"issue_description" text,
	"issue_category" text,
	"urgency" integer,
	"source" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"drip_step" integer DEFAULT 0,
	"drip_next_at" timestamp with time zone,
	"revenue_rescued" numeric,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "revenue_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"date" date NOT NULL,
	"calls_rescued" integer DEFAULT 0,
	"leads_created" integer DEFAULT 0,
	"appointments_booked" integer DEFAULT 0,
	"reviews_requested" integer DEFAULT 0,
	"reviews_received" integer DEFAULT 0,
	"estimated_revenue_rescued" numeric DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"lead_id" uuid,
	"contact_phone" text NOT NULL,
	"request_sent_at" timestamp with time zone,
	"review_received" boolean DEFAULT false,
	"review_rating" integer,
	"review_replied" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_audits" ADD CONSTRAINT "geo_audits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_oauth_tokens" ADD CONSTRAINT "google_oauth_tokens_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_metrics" ADD CONSTRAINT "revenue_metrics_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_appointments_client_scheduled" ON "appointments" USING btree ("client_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_calls_client_created" ON "calls" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_conversations_lookup" ON "conversations" USING btree ("client_id","contact_phone","created_at");--> statement-breakpoint
CREATE INDEX "idx_leads_drip" ON "leads" USING btree ("client_id","status","drip_next_at");--> statement-breakpoint
CREATE INDEX "idx_leads_client_created" ON "leads" USING btree ("client_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_revenue_metrics_unique" ON "revenue_metrics" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "idx_revenue_metrics_client_date" ON "revenue_metrics" USING btree ("client_id","date");--> statement-breakpoint
CREATE INDEX "idx_reviews_client_created" ON "reviews" USING btree ("client_id","created_at");