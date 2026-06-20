import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getGenLayerClient, CONTRACT_ADDRESS, isContractDeployed } from "@/lib/genlayer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  try {
    const { id, mid } = await params;
    const { evidence_url, evidence_description, creator_address } = await req.json();

    const [campaign] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (campaign.creator_address.toLowerCase() !== creator_address?.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [milestone] = await sql`
      SELECT * FROM milestones WHERE id = ${mid} AND campaign_id = ${id}
    `;
    if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    if (milestone.status !== "pending") {
      return NextResponse.json({ error: "Milestone is not pending" }, { status: 400 });
    }

    const now = new Date().toISOString();
    let tx_hash = "";

    if (isContractDeployed()) {
      const client = getGenLayerClient();
      tx_hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "submit_milestone",
        args: [
          campaign.contract_id,
          milestone.contract_milestone_id,
          evidence_url,
          evidence_description,
          now,
          creator_address,
        ],
      });
    }

    await sql`
      UPDATE milestones
      SET status = 'submitted',
          evidence_url = ${evidence_url},
          evidence_description = ${evidence_description},
          submitted_at = ${now}
      WHERE id = ${mid}
    `;

    const [updated] = await sql`SELECT * FROM milestones WHERE id = ${mid}`;
    return NextResponse.json({ milestone: updated, tx_hash });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
