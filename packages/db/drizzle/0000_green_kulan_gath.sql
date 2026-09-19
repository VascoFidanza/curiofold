CREATE TABLE "audit_events" (
	"action" varchar(120) NOT NULL,
	"actor_user_id" uuid,
	"correlation_id" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metadata" jsonb,
	"reason" text,
	"target_id" uuid,
	"target_type" varchar(80) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"high_water_percent" integer DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_client_sequence" integer DEFAULT 0 NOT NULL,
	"locale" varchar(12) NOT NULL,
	"resume_block_id" varchar(120),
	"resume_offset" integer DEFAULT 0 NOT NULL,
	"story_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	CONSTRAINT "reading_progress_high_water_percent_check" CHECK (high_water_percent BETWEEN 0 AND 100),
	CONSTRAINT "reading_progress_resume_offset_check" CHECK (resume_offset >= 0),
	CONSTRAINT "reading_progress_client_sequence_check" CHECK (last_client_sequence >= 0)
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_key" varchar(120) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_localizations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" varchar(12) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"story_id" uuid NOT NULL,
	"title" varchar(240) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_localizations_state_check" CHECK (state IN ('draft', 'published', 'archived', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "story_versions" (
	"content_hash" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"document" jsonb NOT NULL,
	"git_commit_sha" varchar(64) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"localization_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"schema_version" varchar(32) NOT NULL,
	CONSTRAINT "story_versions_revision_positive_check" CHECK ("story_versions"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"account_state" text DEFAULT 'active' NOT NULL,
	"clerk_subject" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_account_state_check" CHECK (account_state IN ('active', 'disabled', 'pending_deletion'))
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_version_id_story_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."story_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_localizations" ADD CONSTRAINT "story_localizations_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_localization_id_story_localizations_id_fk" FOREIGN KEY ("localization_id") REFERENCES "public"."story_localizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_created_at_index" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_events_target_index" ON "audit_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_progress_user_story_locale_unique" ON "reading_progress" USING btree ("user_id","story_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "stories_stable_key_unique" ON "stories" USING btree ("stable_key");--> statement-breakpoint
CREATE UNIQUE INDEX "story_localizations_story_locale_unique" ON "story_localizations" USING btree ("story_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "story_localizations_locale_slug_unique" ON "story_localizations" USING btree ("locale","slug");--> statement-breakpoint
CREATE INDEX "story_localizations_state_index" ON "story_localizations" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "story_versions_localization_revision_unique" ON "story_versions" USING btree ("localization_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "story_versions_content_hash_unique" ON "story_versions" USING btree ("content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_subject_unique" ON "users" USING btree ("clerk_subject");