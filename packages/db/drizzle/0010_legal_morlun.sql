CREATE TABLE "payment_reconciliation_jobs" (
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exhausted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_error_code" varchar(80),
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_reconciliation_jobs_attempt_check" CHECK ("payment_reconciliation_jobs"."attempt_count" >= 0),
	CONSTRAINT "payment_reconciliation_jobs_status_check" CHECK ("payment_reconciliation_jobs"."status" IN ('pending', 'running', 'completed', 'exhausted'))
);
--> statement-breakpoint
ALTER TABLE "payment_reconciliation_jobs" ADD CONSTRAINT "payment_reconciliation_jobs_order_id_payment_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."payment_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_reconciliation_jobs_order_unique" ON "payment_reconciliation_jobs" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_reconciliation_jobs_due_index" ON "payment_reconciliation_jobs" USING btree ("status","next_attempt_at");