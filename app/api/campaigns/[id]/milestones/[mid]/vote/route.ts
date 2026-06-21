import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  try {
    const { id, mid } = await params;
    const { voter_address, approve, tx_hash = "" } = await req.json();

    if (!voter_address || typeof approve !== "boolean") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const [milestone] = await sql`
      SELECT * FROM milestones WHERE id = ${mid} AND campaign_id = ${id}
    `;
    if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    if (milestone.status !== "voting") {
      return NextResponse.json({ error: "Not in voting state" }, { status: 400 });
    }

    const [backer] = await sql`
      SELECT * FROM backers
      WHERE campaign_id = ${id} AND LOWER(backer_address) = LOWER(${voter_address})
    `;
    if (!backer) {
      return NextResponse.json({ error: "Only backers can vote" }, { status: 403 });
    }

    // Optimistic tally update
    const stake = backer.amount_wei;
    if (approve) {
      await sql`
        UPDATE milestones
        SET votes_approve = (votes_approve::numeric + ${stake}::numeric)::text
        WHERE id = ${mid}
      `;
    } else {
      await sql`
        UPDATE milestones
        SET votes_reject = (votes_reject::numeric + ${stake}::numeric)::text
        WHERE id = ${mid}
      `;
    }

    const [updated] = await sql`SELECT * FROM milestones WHERE id = ${mid}`;
    return NextResponse.json({ milestone: updated, tx_hash });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
