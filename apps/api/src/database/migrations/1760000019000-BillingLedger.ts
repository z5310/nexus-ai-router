import { MigrationInterface, QueryRunner } from 'typeorm'

export class BillingLedger1760000019000 implements MigrationInterface {
  name = 'BillingLedger1760000019000'

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE billing_accounts (
        workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE RESTRICT,
        available_micros bigint NOT NULL DEFAULT 0 CHECK (available_micros >= 0),
        reserved_micros bigint NOT NULL DEFAULT 0 CHECK (reserved_micros >= 0),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE billing_reservations (
        workspace_id uuid NOT NULL REFERENCES billing_accounts(workspace_id) ON DELETE RESTRICT,
        request_id varchar(120) NOT NULL,
        amount_micros bigint NOT NULL CHECK (amount_micros >= 0),
        settled_micros bigint CHECK (settled_micros >= 0),
        status varchar(20) NOT NULL CHECK (status IN ('held','settled','released')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (workspace_id, request_id),
        CHECK ((status = 'settled' AND settled_micros IS NOT NULL) OR (status <> 'settled' AND settled_micros IS NULL))
      );
      CREATE TABLE billing_ledger (
        id bigserial PRIMARY KEY,
        workspace_id uuid NOT NULL REFERENCES billing_accounts(workspace_id) ON DELETE RESTRICT,
        kind varchar(20) NOT NULL CHECK (kind IN ('grant','reserve','settle','release')),
        reference varchar(120) NOT NULL,
        amount_micros bigint NOT NULL CHECK (amount_micros >= 0),
        available_delta bigint NOT NULL,
        reserved_delta bigint NOT NULL,
        available_after bigint NOT NULL CHECK (available_after >= 0),
        reserved_after bigint NOT NULL CHECK (reserved_after >= 0),
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (workspace_id, kind, reference)
      );
      CREATE INDEX billing_ledger_workspace_cursor ON billing_ledger(workspace_id, id DESC);
      CREATE FUNCTION billing_reject_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'billing ledger is append-only'; END;
      $$;
      CREATE TRIGGER billing_ledger_immutable BEFORE UPDATE OR DELETE ON billing_ledger
        FOR EACH ROW EXECUTE FUNCTION billing_reject_ledger_mutation();
      CREATE TRIGGER billing_ledger_no_truncate BEFORE TRUNCATE ON billing_ledger
        FOR EACH STATEMENT EXECUTE FUNCTION billing_reject_ledger_mutation();
    `)
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE billing_ledger; DROP FUNCTION billing_reject_ledger_mutation(); DROP TABLE billing_reservations; DROP TABLE billing_accounts;`)
  }
}
