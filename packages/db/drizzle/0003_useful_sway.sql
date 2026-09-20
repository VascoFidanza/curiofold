CREATE TABLE "entitlement_events" (
	"actor_user_id" uuid,
	"entitlement_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "entitlement_events_type_check" CHECK (event_type IN ('granted', 'restored', 'revoked')),
	CONSTRAINT "entitlement_events_reason_check" CHECK (length(trim("entitlement_events"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "story_entitlements" (
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"grant_source" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revoked_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"story_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "story_entitlements_status_check" CHECK (status IN ('active', 'revoked')),
	CONSTRAINT "story_entitlements_grant_source_check" CHECK (grant_source IN ('seed', 'support', 'unlock')),
	CONSTRAINT "story_entitlements_revocation_check" CHECK ((status = 'active' AND "story_entitlements"."revoked_at" IS NULL) OR (status = 'revoked' AND "story_entitlements"."revoked_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "entitlement_events" ADD CONSTRAINT "entitlement_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_events" ADD CONSTRAINT "entitlement_events_entitlement_id_story_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."story_entitlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_entitlements" ADD CONSTRAINT "story_entitlements_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_entitlements" ADD CONSTRAINT "story_entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entitlement_events_entitlement_occurred_index" ON "entitlement_events" USING btree ("entitlement_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "story_entitlements_user_story_unique" ON "story_entitlements" USING btree ("user_id","story_id");--> statement-breakpoint
CREATE INDEX "story_entitlements_story_index" ON "story_entitlements" USING btree ("story_id");