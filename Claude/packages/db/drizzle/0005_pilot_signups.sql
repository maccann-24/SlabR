CREATE TABLE IF NOT EXISTS "pilot_signups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_name" text NOT NULL,
  "owner_name" text,
  "phone" text NOT NULL,
  "industry" text DEFAULT 'plumbing',
  "status" text DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now()
);
