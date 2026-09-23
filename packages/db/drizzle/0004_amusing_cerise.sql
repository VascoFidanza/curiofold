CREATE TABLE "credit_grants" (
	"actor_user_id" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_key" varchar(200) NOT NULL,
	"reason" text NOT NULL,
	"source" text NOT NULL,
	"source_reference" varchar(255),
	"units_granted" integer NOT NULL,
	"units_remaining" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"wallet_account_id" uuid NOT NULL,
	CONSTRAINT "credit_grants_source_check" CHECK (source IN ('correction', 'payment', 'promotional', 'seed', 'support')),
	CONSTRAINT "credit_grants_units_check" CHECK ("credit_grants"."units_granted" > 0 AND "credit_grants"."units_remaining" BETWEEN 0 AND "credit_grants"."units_granted"),
	CONSTRAINT "credit_grants_operation_key_check" CHECK (length(trim("credit_grants"."operation_key")) BETWEEN 1 AND 200),
	CONSTRAINT "credit_grants_reason_check" CHECK (length(trim("credit_grants"."reason")) > 0),
	CONSTRAINT "credit_grants_source_reference_check" CHECK ("credit_grants"."source_reference" IS NULL OR length(trim("credit_grants"."source_reference")) > 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_accounts" (
	"balance_cached" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "wallet_accounts_version_check" CHECK ("wallet_accounts"."version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wallet_entries" (
	"actor_user_id" uuid,
	"balance_after" integer NOT NULL,
	"credit_grant_id" uuid,
	"delta" integer NOT NULL,
	"entry_type" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"operation_key" varchar(200) NOT NULL,
	"reason" text NOT NULL,
	"wallet_account_id" uuid NOT NULL,
	CONSTRAINT "wallet_entries_type_check" CHECK (entry_type IN ('correction', 'grant', 'reversal', 'spend')),
	CONSTRAINT "wallet_entries_delta_check" CHECK ("wallet_entries"."delta" <> 0),
	CONSTRAINT "wallet_entries_shape_check" CHECK (("wallet_entries"."entry_type" = 'grant' AND "wallet_entries"."credit_grant_id" IS NOT NULL AND "wallet_entries"."delta" > 0) OR ("wallet_entries"."entry_type" = 'spend' AND "wallet_entries"."credit_grant_id" IS NULL AND "wallet_entries"."delta" < 0) OR ("wallet_entries"."entry_type" IN ('correction', 'reversal') AND "wallet_entries"."delta" <> 0)),
	CONSTRAINT "wallet_entries_operation_key_check" CHECK (length(trim("wallet_entries"."operation_key")) BETWEEN 1 AND 200),
	CONSTRAINT "wallet_entries_reason_check" CHECK (length(trim("wallet_entries"."reason")) > 0)
);
--> statement-breakpoint
ALTER TABLE "credit_grants" ADD CONSTRAINT "credit_grants_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_grants" ADD CONSTRAINT "credit_grants_wallet_account_id_wallet_accounts_id_fk" FOREIGN KEY ("wallet_account_id") REFERENCES "public"."wallet_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_credit_grant_id_credit_grants_id_fk" FOREIGN KEY ("credit_grant_id") REFERENCES "public"."credit_grants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_wallet_account_id_wallet_accounts_id_fk" FOREIGN KEY ("wallet_account_id") REFERENCES "public"."wallet_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_grants_operation_key_unique" ON "credit_grants" USING btree ("operation_key");--> statement-breakpoint
CREATE INDEX "credit_grants_wallet_granted_index" ON "credit_grants" USING btree ("wallet_account_id","granted_at");--> statement-breakpoint
CREATE INDEX "credit_grants_source_reference_index" ON "credit_grants" USING btree ("source","source_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_accounts_user_unique" ON "wallet_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_entries_operation_key_unique" ON "wallet_entries" USING btree ("operation_key");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_entries_credit_grant_unique" ON "wallet_entries" USING btree ("credit_grant_id") WHERE "wallet_entries"."credit_grant_id" IS NOT NULL AND "wallet_entries"."entry_type" = 'grant';--> statement-breakpoint
CREATE INDEX "wallet_entries_wallet_occurred_index" ON "wallet_entries" USING btree ("wallet_account_id","occurred_at");--> statement-breakpoint
CREATE FUNCTION prevent_wallet_entry_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'wallet entries are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER wallet_entries_append_only
BEFORE UPDATE OR DELETE ON "wallet_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_wallet_entry_mutation();--> statement-breakpoint
CREATE FUNCTION protect_credit_grant_provenance() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'credit grants cannot be deleted';
	END IF;

	IF NEW."id" IS DISTINCT FROM OLD."id"
		OR NEW."actor_user_id" IS DISTINCT FROM OLD."actor_user_id"
		OR NEW."granted_at" IS DISTINCT FROM OLD."granted_at"
		OR NEW."operation_key" IS DISTINCT FROM OLD."operation_key"
		OR NEW."reason" IS DISTINCT FROM OLD."reason"
		OR NEW."source" IS DISTINCT FROM OLD."source"
		OR NEW."source_reference" IS DISTINCT FROM OLD."source_reference"
		OR NEW."units_granted" IS DISTINCT FROM OLD."units_granted"
		OR NEW."wallet_account_id" IS DISTINCT FROM OLD."wallet_account_id"
	THEN
		RAISE EXCEPTION 'credit grant provenance is immutable';
	END IF;

	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER credit_grants_provenance_immutable
BEFORE UPDATE OR DELETE ON "credit_grants"
FOR EACH ROW EXECUTE FUNCTION protect_credit_grant_provenance();
