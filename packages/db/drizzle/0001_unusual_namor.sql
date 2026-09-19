ALTER TABLE "story_localizations" ADD COLUMN "current_published_version_id" uuid;--> statement-breakpoint
ALTER TABLE "story_localizations" ADD COLUMN "deck" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "story_localizations" ADD COLUMN "hook" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "story_localizations" ADD COLUMN "preview" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "story_localizations" ADD COLUMN "reading_minutes" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "story_versions" ADD COLUMN "previous_version_id" uuid;--> statement-breakpoint
ALTER TABLE "story_versions" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "story_versions" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "story_versions" ADD COLUMN "reviewed_by" varchar(240);--> statement-breakpoint
ALTER TABLE "story_localizations" ADD CONSTRAINT "story_localizations_current_published_version_id_story_versions_id_fk" FOREIGN KEY ("current_published_version_id") REFERENCES "public"."story_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_versions" ADD CONSTRAINT "story_versions_previous_version_id_story_versions_id_fk" FOREIGN KEY ("previous_version_id") REFERENCES "public"."story_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_localizations" ADD CONSTRAINT "story_localizations_reading_minutes_positive_check" CHECK ("story_localizations"."reading_minutes" > 0);--> statement-breakpoint
ALTER TABLE "story_localizations" ADD CONSTRAINT "story_localizations_published_pointer_check" CHECK ("story_localizations"."state" <> 'published' OR "story_localizations"."current_published_version_id" IS NOT NULL);