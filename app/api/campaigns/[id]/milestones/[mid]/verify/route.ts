import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getGenLayerClient, CONTRACT_ADDRESS, isContractDeployed } from "@/lib/genlayer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  try {
    const { id, mid } = await params;

    const [campaign] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [milestone] = await sql`
      SELECT * FROM milestones WHERE id = ${mid} AND campaign_id = ${id}
    `;
    if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    if (milestone.status !== "submitted") {
      return NextResponse.json({ error: "Milestone not submitted" }, { status: 400 });
    }

    const now = new Date().toISOString();
    let tx_hash = "";

    if (isContractDeployed()) {
      const client = getGenLayerClient();
      // AI verification tx — submit and return immediately. Verdict is determined on-chain.
      tx_hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "verify_milestone",
        args: [campaign.contract_id, milestone.contract_milestone_id, now],
      });
    }

    // Mark as "verifying" in DB; the sync endpoint will update to approved/voting once finalized
    await sql`
      UPDATE milestones
      SET status = 'verifying', resolved_at = ${now}
      WHERE id = ${mid}
    `;

    const [updated] = await sql`SELECT * FROM milestones WHERE id = ${mid}`;
    return NextResponse.json({ milestone: updated, tx_hash, pending: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
