CREATE TABLE "credit_spend_allocations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"credit_grant_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"units" integer NOT NULL,
	"wallet_entry_id" uuid NOT NULL,
	CONSTRAINT "credit_spend_allocations_units_check" CHECK ("credit_spend_allocations"."units" > 0)
);
--> statement-breakpoint
CREATE TABLE "unlock_operations" (
	"balance_after" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_key" varchar(200) NOT NULL,
	"outcome" text NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_entry_id" uuid,
	"wallet_version" integer NOT NULL,
	CONSTRAINT "unlock_operations_outcome_check" CHECK (outcome IN ('already_owned', 'unlocked')),
	CONSTRAINT "unlock_operations_result_shape_check" CHECK (("unlock_operations"."outcome" = 'unlocked' AND "unlock_operations"."wallet_entry_id" IS NOT NULL) OR ("unlock_operations"."outcome" = 'already_owned' AND "unlock_operations"."wallet_entry_id" IS NULL)),
	CONSTRAINT "unlock_operations_balance_check" CHECK ("unlock_operations"."balance_after" >= 0 AND "unlock_operations"."wallet_version" >= 0),
	CONSTRAINT "unlock_operations_operation_key_check" CHECK (length(trim("unlock_operations"."operation_key")) BETWEEN 1 AND 200)
);
--> statement-breakpoint
ALTER TABLE "credit_spend_allocations" ADD CONSTRAINT "credit_spend_allocations_credit_grant_id_credit_grants_id_fk" FOREIGN KEY ("credit_grant_id") REFERENCES "public"."credit_grants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_spend_allocations" ADD CONSTRAINT "credit_spend_allocations_wallet_entry_id_wallet_entries_id_fk" FOREIGN KEY ("wallet_entry_id") REFERENCES "public"."wallet_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlock_operations" ADD CONSTRAINT "unlock_operations_entitlement_id_story_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."story_entitlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlock_operations" ADD CONSTRAINT "unlock_operations_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlock_operations" ADD CONSTRAINT "unlock_operations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unlock_operations" ADD CONSTRAINT "unlock_operations_wallet_entry_id_wallet_entries_id_fk" FOREIGN KEY ("wallet_entry_id") REFERENCES "public"."wallet_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_spend_allocations_entry_grant_unique" ON "credit_spend_allocations" USING btree ("wallet_entry_id","credit_grant_id");--> statement-breakpoint
CREATE INDEX "credit_spend_allocations_grant_index" ON "credit_spend_allocations" USING btree ("credit_grant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unlock_operations_operation_key_unique" ON "unlock_operations" USING btree ("operation_key");--> statement-breakpoint
CREATE INDEX "unlock_operations_user_created_index" ON "unlock_operations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "unlock_operations_story_index" ON "unlock_operations" USING btree ("story_id");--> statement-breakpoint
CREATE FUNCTION prevent_credit_spend_allocation_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'credit spend allocations are append-only';
END;
$$;--> statement-breakpoint
CREATE TRIGGER credit_spend_allocations_append_only
BEFORE UPDATE OR DELETE ON "credit_spend_allocations"
FOR EACH ROW EXECUTE FUNCTION prevent_credit_spend_allocation_mutation();--> statement-breakpoint
CREATE FUNCTION prevent_unlock_operation_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'unlock operations are immutable';
END;
$$;--> statement-breakpoint
CREATE TRIGGER unlock_operations_immutable
BEFORE UPDATE OR DELETE ON "unlock_operations"
FOR EACH ROW EXECUTE FUNCTION prevent_unlock_operation_mutation();
