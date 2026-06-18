import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function init() {
  console.log("Initializing Kindling database schema...");

  await sql`
    CREATE TABLE IF NOT EXISTS campaigns (
      id            TEXT PRIMARY KEY,
      contract_id   TEXT NOT NULL,
      creator_address TEXT NOT NULL,
      title         TEXT NOT NULL,
      description   TEXT NOT NULL,
      goal_wei      TEXT NOT NULL,
      raised_wei    TEXT NOT NULL DEFAULT '0',
      backer_count  INTEGER NOT NULL DEFAULT 0,
      deadline      TEXT NOT NULL,
      image_url     TEXT NOT NULL DEFAULT '',
      category      TEXT NOT NULL DEFAULT 'general',
      status        TEXT NOT NULL DEFAULT 'active',
      created_at    TEXT NOT NULL,
      milestone_count INTEGER NOT NULL DEFAULT 0,
      tx_hash       TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS milestones (
      id                    TEXT PRIMARY KEY,
      campaign_id           TEXT NOT NULL REFERENCES campaigns(id),
      contract_milestone_id TEXT NOT NULL,
      title                 TEXT NOT NULL,
      description           TEXT NOT NULL,
      target_amount_wei     TEXT NOT NULL,
      due_date              TEXT NOT NULL,
      status                TEXT NOT NULL DEFAULT 'pending',
      evidence_url          TEXT,
      evidence_description  TEXT,
      submitted_at          TEXT,
      resolved_at           TEXT,
      votes_approve         TEXT NOT NULL DEFAULT '0',
      votes_reject          TEXT NOT NULL DEFAULT '0',
      order_index           INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS backers (
      id               TEXT PRIMARY KEY,
      campaign_id      TEXT NOT NULL REFERENCES campaigns(id),
      backer_address   TEXT NOT NULL,
      amount_wei       TEXT NOT NULL,
      backed_at        TEXT NOT NULL,
      tx_hash          TEXT,
      refunded         BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(campaign_id, backer_address)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON campaigns(creator_address)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_milestones_campaign ON milestones(campaign_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_backers_campaign ON backers(campaign_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_backers_address ON backers(backer_address)
  `;

  console.log("Schema initialized successfully.");
}

init().catch((err) => {
  console.error("DB init failed:", err);
  process.exit(1);
});
