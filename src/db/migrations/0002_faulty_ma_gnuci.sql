CREATE TABLE "ats_scans" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"score" integer NOT NULL,
	"scores" jsonb NOT NULL,
	"missing_keywords" jsonb NOT NULL,
	"format_risks" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ats_scans" ADD CONSTRAINT "ats_scans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;