import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  try {
    const { id, mid } = await params;
    const { wallet_address } = await req.json();

    const [campaign] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Only the creator can reset
    if (
      !wallet_address ||
      campaign.creator_address.toLowerCase() !== wallet_address.toLowerCase()
    ) {
      return NextResponse.json({ error: "Only the creator can retry verification" }, { status: 403 });
    }

    const [milestone] = await sql`
      SELECT * FROM milestones WHERE id = ${mid} AND campaign_id = ${id}
    `;
    if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    if (milestone.status !== "verifying") {
      return NextResponse.json({ error: "Milestone is not in verifying state" }, { status: 400 });
    }

    await sql`
      UPDATE milestones SET status = 'submitted', resolved_at = null WHERE id = ${mid}
    `;

    return NextResponse.json({ reset: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
