import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getGenLayerClient, CONTRACT_ADDRESS, isContractDeployed } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

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
    let newStatus = "voting";

    if (isContractDeployed()) {
      const client = getGenLayerClient();
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "verify_milestone",
        args: [campaign.contract_id, milestone.contract_milestone_id, now],
      });
      const receipt = await client.waitForTransactionReceipt({
        hash: tx,
        status: TransactionStatus.FINALIZED,
      });

      // Read back the milestone state from chain to get verdict
      const chainMilestones = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_milestones",
        args: [campaign.contract_id],
      }) as Array<{ id: string; status: string }>;

      const chainM = chainMilestones.find(
        (m) => m.id === milestone.contract_milestone_id
      );
      if (chainM) newStatus = chainM.status;
    }

    await sql`
      UPDATE milestones
      SET status = ${newStatus}, resolved_at = ${now}
      WHERE id = ${mid}
    `;

    // If a milestone is rejected and goes to voting, the campaign stays as-is
    const [updated] = await sql`SELECT * FROM milestones WHERE id = ${mid}`;
    return NextResponse.json({ milestone: updated, verdict: newStatus });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
