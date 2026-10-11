-- One-time fix: if tables in this database end up owned by a different
-- role than the app's own DB user (e.g. `postgres`, because they were
-- created by a superuser connection during initial setup), `prisma
-- migrate deploy` fails with "must be owner of table X" on every
-- migration that touches them. Root cause found in projects-v1-app, see
-- its dev_notes/document_extraction.md and dev_notes/documents.md.
--
-- This lists the template's own tables (NextAuth standard tables + User).
-- An app built on this template that adds its own models must regenerate
-- this list to include them — the query below does that automatically.
--
-- Run this once as a superuser (e.g. `psql -U postgres -d core -f scripts/fix-table-ownership.sql`,
-- replacing `core`/`core_app` with this app's actual DB name/role), on
-- every environment that has this problem (local dev DB, production
-- server). Safe to re-run - ALTER ... OWNER TO is idempotent, and this
-- only changes ownership metadata, not any data.
--
-- Regenerate this list any time (replace `core_app` with the actual DB role) with:
--   SELECT 'ALTER TABLE "' || tablename || '" OWNER TO core_app;' FROM pg_tables WHERE schemaname='public' AND tableowner != 'core_app';
--   SELECT 'ALTER SEQUENCE "' || sequence_name || '" OWNER TO core_app;' FROM information_schema.sequences WHERE sequence_schema='public';

ALTER TABLE "_prisma_migrations" OWNER TO core_app;
ALTER TABLE "accounts" OWNER TO core_app;
ALTER TABLE "sessions" OWNER TO core_app;
ALTER TABLE "users" OWNER TO core_app;
ALTER TABLE "verificationtokens" OWNER TO core_app;
