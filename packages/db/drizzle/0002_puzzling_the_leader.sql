CREATE TABLE "identity_events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"result" text DEFAULT 'applied' NOT NULL,
	"subject" varchar(255) NOT NULL,
	CONSTRAINT "identity_events_type_check" CHECK (event_type IN ('user.created', 'user.deleted', 'user.updated')),
	CONSTRAINT "identity_events_result_check" CHECK (result IN ('applied', 'duplicate', 'ignored'))
);
--> statement-breakpoint
CREATE TABLE "staff_role_assignments" (
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by_user_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reason" text NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by_user_id" uuid,
	"role" text NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "staff_role_assignments_role_check" CHECK (role IN ('editor', 'publisher', 'support', 'finance', 'admin')),
	CONSTRAINT "staff_role_assignments_revocation_check" CHECK ("staff_role_assignments"."revoked_at" IS NULL OR ("staff_role_assignments"."revoked_by_user_id" IS NOT NULL AND "staff_role_assignments"."revoked_at" >= "staff_role_assignments"."granted_at"))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_authenticated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_identity_event_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_identity_event_id" varchar(255);--> statement-breakpoint
ALTER TABLE "staff_role_assignments" ADD CONSTRAINT "staff_role_assignments_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_role_assignments" ADD CONSTRAINT "staff_role_assignments_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_role_assignments" ADD CONSTRAINT "staff_role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identity_events_provider_event_id_unique" ON "identity_events" USING btree ("provider_event_id");--> statement-breakpoint
CREATE INDEX "identity_events_subject_occurred_at_index" ON "identity_events" USING btree ("subject","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_role_assignments_active_role_unique" ON "staff_role_assignments" USING btree ("user_id","role") WHERE "staff_role_assignments"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "staff_role_assignments_user_index" ON "staff_role_assignments" USING btree ("user_id");