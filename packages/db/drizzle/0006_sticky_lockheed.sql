ALTER TABLE "wallet_entries" ADD COLUMN "wallet_version" integer;--> statement-breakpoint
ALTER TABLE "wallet_entries" DISABLE TRIGGER "wallet_entries_append_only";--> statement-breakpoint
WITH ranked_entries AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "wallet_account_id"
		ORDER BY "occurred_at", "id"
	)::integer AS "wallet_version"
	FROM "wallet_entries"
)
UPDATE "wallet_entries"
SET "wallet_version" = ranked_entries."wallet_version"
FROM ranked_entries
WHERE "wallet_entries"."id" = ranked_entries."id";--> statement-breakpoint
ALTER TABLE "wallet_entries" ENABLE TRIGGER "wallet_entries_append_only";--> statement-breakpoint
ALTER TABLE "wallet_entries" ALTER COLUMN "wallet_version" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_entries_wallet_version_unique" ON "wallet_entries" USING btree ("wallet_account_id","wallet_version");--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_version_check" CHECK ("wallet_entries"."wallet_version" > 0);
