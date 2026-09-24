CREATE TABLE "outbox_events" (
	"aggregate_id" uuid NOT NULL,
	"aggregate_type" varchar(80) NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payload" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "outbox_events_attempt_count_check" CHECK ("outbox_events"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "provider_events" (
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"order_id" uuid,
	"payload_digest" varchar(64) NOT NULL,
	"processed_at" timestamp with time zone,
	"provider_created_at" timestamp with time zone NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"provider_key" varchar(80) NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	CONSTRAINT "provider_events_digest_check" CHECK ("provider_events"."payload_digest" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "provider_events_status_check" CHECK ("provider_events"."status" IN ('pending', 'processed')),
	CONSTRAINT "provider_events_attempt_count_check" CHECK ("provider_events"."attempt_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "provider_events" ADD CONSTRAINT "provider_events_order_id_payment_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."payment_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_events_aggregate_event_unique" ON "outbox_events" USING btree ("aggregate_type","aggregate_id","event_type");--> statement-breakpoint
CREATE INDEX "outbox_events_unpublished_index" ON "outbox_events" USING btree ("created_at") WHERE "outbox_events"."published_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_events_provider_id_unique" ON "provider_events" USING btree ("provider_key","provider_event_id");--> statement-breakpoint
CREATE INDEX "provider_events_status_received_index" ON "provider_events" USING btree ("status","received_at");--> statement-breakpoint
CREATE FUNCTION protect_provider_event_envelope() RETURNS trigger AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'provider events are immutable evidence and cannot be deleted';
	END IF;

	IF NEW."provider_key" IS DISTINCT FROM OLD."provider_key"
		OR NEW."provider_event_id" IS DISTINCT FROM OLD."provider_event_id"
		OR NEW."event_type" IS DISTINCT FROM OLD."event_type"
		OR NEW."provider_created_at" IS DISTINCT FROM OLD."provider_created_at"
		OR NEW."received_at" IS DISTINCT FROM OLD."received_at"
		OR NEW."payload_digest" IS DISTINCT FROM OLD."payload_digest" THEN
		RAISE EXCEPTION 'provider event envelopes are immutable';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "provider_events_protect_envelope"
BEFORE UPDATE OR DELETE ON "provider_events"
FOR EACH ROW EXECUTE FUNCTION protect_provider_event_envelope();--> statement-breakpoint
CREATE FUNCTION protect_outbox_event_envelope() RETURNS trigger AS $$
BEGIN
	IF TG_OP = 'DELETE' THEN
		RAISE EXCEPTION 'outbox events are immutable evidence and cannot be deleted';
	END IF;

	IF NEW."aggregate_id" IS DISTINCT FROM OLD."aggregate_id"
		OR NEW."aggregate_type" IS DISTINCT FROM OLD."aggregate_type"
		OR NEW."event_type" IS DISTINCT FROM OLD."event_type"
		OR NEW."payload" IS DISTINCT FROM OLD."payload"
		OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
		RAISE EXCEPTION 'outbox event envelopes are immutable';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "outbox_events_protect_envelope"
BEFORE UPDATE OR DELETE ON "outbox_events"
FOR EACH ROW EXECUTE FUNCTION protect_outbox_event_envelope();
