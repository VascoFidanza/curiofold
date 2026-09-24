CREATE TABLE "payment_reversals" (
	"amount_minor" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	"credits_requested" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"operation_key" varchar(200) NOT NULL,
	"order_id" uuid NOT NULL,
	"provider_key" varchar(80),
	"provider_reversal_id" varchar(255),
	"reason_code" varchar(80) NOT NULL,
	"status" text DEFAULT 'requested' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_reversals_amount_check" CHECK ("payment_reversals"."amount_minor" > 0),
	CONSTRAINT "payment_reversals_credits_check" CHECK ("payment_reversals"."credits_requested" >= 0),
	CONSTRAINT "payment_reversals_currency_check" CHECK ("payment_reversals"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "payment_reversals_kind_check" CHECK ("payment_reversals"."kind" IN ('refund', 'dispute', 'support_correction')),
	CONSTRAINT "payment_reversals_reason_check" CHECK ("payment_reversals"."reason_code" ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
	CONSTRAINT "payment_reversals_status_check" CHECK ("payment_reversals"."status" IN ('requested', 'provider_pending', 'completed', 'rejected', 'canceled', 'manual_review')),
	CONSTRAINT "payment_reversals_provider_shape_check" CHECK (("payment_reversals"."provider_key" IS NULL AND "payment_reversals"."provider_reversal_id" IS NULL) OR ("payment_reversals"."provider_key" IS NOT NULL AND "payment_reversals"."provider_reversal_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "payment_reversals" ADD CONSTRAINT "payment_reversals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reversals" ADD CONSTRAINT "payment_reversals_order_id_payment_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."payment_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_reversals_operation_unique" ON "payment_reversals" USING btree ("operation_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_reversals_provider_unique" ON "payment_reversals" USING btree ("provider_key","provider_reversal_id") WHERE "payment_reversals"."provider_reversal_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payment_reversals_order_created_index" ON "payment_reversals" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_reversals_status_updated_index" ON "payment_reversals" USING btree ("status","updated_at");
--> statement-breakpoint
CREATE FUNCTION protect_payment_reversal_history() RETURNS trigger AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'payment reversals are immutable history and cannot be deleted';
	END IF;

	IF NEW."order_id" IS DISTINCT FROM OLD."order_id"
		OR NEW."operation_key" IS DISTINCT FROM OLD."operation_key"
		OR NEW."kind" IS DISTINCT FROM OLD."kind"
		OR NEW."amount_minor" IS DISTINCT FROM OLD."amount_minor"
		OR NEW."currency" IS DISTINCT FROM OLD."currency"
		OR NEW."credits_requested" IS DISTINCT FROM OLD."credits_requested"
		OR NEW."reason_code" IS DISTINCT FROM OLD."reason_code"
		OR NEW."created_by_user_id" IS DISTINCT FROM OLD."created_by_user_id"
		OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
		RAISE EXCEPTION 'payment reversal financial evidence is immutable';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "payment_reversals_protect_history"
BEFORE UPDATE OR DELETE ON "payment_reversals"
FOR EACH ROW EXECUTE FUNCTION protect_payment_reversal_history();
