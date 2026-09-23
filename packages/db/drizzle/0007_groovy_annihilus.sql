CREATE TABLE "payment_orders" (
	"amount_minor" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"credits_purchased" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_key" varchar(200) NOT NULL,
	"pack_key" varchar(80) NOT NULL,
	"provider_checkout_session_id" varchar(255),
	"provider_key" varchar(80),
	"provider_payment_id" varchar(255),
	"return_path" varchar(500) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "payment_orders_amount_check" CHECK ("payment_orders"."amount_minor" > 0),
	CONSTRAINT "payment_orders_credits_check" CHECK ("payment_orders"."credits_purchased" > 0),
	CONSTRAINT "payment_orders_currency_check" CHECK ("payment_orders"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "payment_orders_pack_key_check" CHECK ("payment_orders"."pack_key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "payment_orders_operation_key_check" CHECK (length(trim("payment_orders"."operation_key")) BETWEEN 1 AND 200),
	CONSTRAINT "payment_orders_return_path_check" CHECK ("payment_orders"."return_path" LIKE '/%' AND "payment_orders"."return_path" NOT LIKE '//%'),
	CONSTRAINT "payment_orders_status_check" CHECK ("payment_orders"."status" IN ('pending', 'checkout_created', 'payment_pending', 'fulfilled', 'canceled')),
	CONSTRAINT "payment_orders_provider_shape_check" CHECK (("payment_orders"."provider_key" IS NULL AND "payment_orders"."provider_checkout_session_id" IS NULL AND "payment_orders"."provider_payment_id" IS NULL) OR ("payment_orders"."provider_key" IS NOT NULL AND "payment_orders"."provider_checkout_session_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_user_operation_unique" ON "payment_orders" USING btree ("user_id","operation_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_provider_session_unique" ON "payment_orders" USING btree ("provider_key","provider_checkout_session_id") WHERE "payment_orders"."provider_checkout_session_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_orders_provider_payment_unique" ON "payment_orders" USING btree ("provider_key","provider_payment_id") WHERE "payment_orders"."provider_payment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payment_orders_user_created_index" ON "payment_orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_orders_status_updated_index" ON "payment_orders" USING btree ("status","updated_at");--> statement-breakpoint
CREATE FUNCTION protect_payment_order_history() RETURNS trigger AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'payment orders are immutable history and cannot be deleted';
	END IF;

	IF NEW."user_id" IS DISTINCT FROM OLD."user_id"
		OR NEW."operation_key" IS DISTINCT FROM OLD."operation_key"
		OR NEW."pack_key" IS DISTINCT FROM OLD."pack_key"
		OR NEW."credits_purchased" IS DISTINCT FROM OLD."credits_purchased"
		OR NEW."amount_minor" IS DISTINCT FROM OLD."amount_minor"
		OR NEW."currency" IS DISTINCT FROM OLD."currency"
		OR NEW."return_path" IS DISTINCT FROM OLD."return_path"
		OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
		RAISE EXCEPTION 'payment order commercial snapshots are immutable';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "payment_orders_protect_history"
BEFORE UPDATE OR DELETE ON "payment_orders"
FOR EACH ROW EXECUTE FUNCTION protect_payment_order_history();
