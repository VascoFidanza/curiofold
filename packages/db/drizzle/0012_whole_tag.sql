ALTER TABLE "payment_orders" DROP CONSTRAINT "payment_orders_pricing_shape_check";--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_pricing_shape_check" CHECK (("payment_orders"."pricing_version" IS NULL AND "payment_orders"."purchase_type" IS NULL AND "payment_orders"."base_credits" IS NULL AND "payment_orders"."bonus_rate_bps" IS NULL AND "payment_orders"."bonus_credits" IS NULL) OR ("payment_orders"."pricing_version" IS NOT NULL AND "payment_orders"."purchase_type" IN ('credit_top_up', 'individual_story') AND "payment_orders"."base_credits" IS NOT NULL AND "payment_orders"."bonus_rate_bps" IS NOT NULL AND "payment_orders"."bonus_credits" IS NOT NULL AND "payment_orders"."base_credits" > 0 AND "payment_orders"."bonus_rate_bps" BETWEEN 0 AND 1800 AND "payment_orders"."bonus_credits" >= 0 AND "payment_orders"."credits_purchased" = "payment_orders"."base_credits" + "payment_orders"."bonus_credits" AND ("payment_orders"."purchase_type" <> 'credit_top_up' OR ("payment_orders"."currency" = 'EUR' AND "payment_orders"."amount_minor" = "payment_orders"."base_credits" * 100))));--> statement-breakpoint
CREATE OR REPLACE FUNCTION protect_payment_order_history() RETURNS trigger AS $$
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
		OR NEW."pricing_version" IS DISTINCT FROM OLD."pricing_version"
		OR NEW."purchase_type" IS DISTINCT FROM OLD."purchase_type"
		OR NEW."base_credits" IS DISTINCT FROM OLD."base_credits"
		OR NEW."bonus_rate_bps" IS DISTINCT FROM OLD."bonus_rate_bps"
		OR NEW."bonus_credits" IS DISTINCT FROM OLD."bonus_credits"
		OR NEW."return_path" IS DISTINCT FROM OLD."return_path"
		OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
		RAISE EXCEPTION 'payment order commercial snapshots are immutable';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
