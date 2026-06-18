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
    if (milestone.status !== "voting") {
      return NextResponse.json({ error: "Not in voting state" }, { status: 400 });
    }

    const now = new Date().toISOString();
    let tx_hash = "";

    if (isContractDeployed()) {
      const client = getGenLayerClient();
      tx_hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "finalize_vote",
        args: [campaign.contract_id, milestone.contract_milestone_id, now],
      });
    }

    // Compute outcome locally from DB vote tallies (optimistic prediction)
    const approveVotes = BigInt(milestone.votes_approve || "0");
    const rejectVotes = BigInt(milestone.votes_reject || "0");
    const newMilestoneStatus = approveVotes >= rejectVotes ? "approved" : "rejected";
    const newCampaignStatus = newMilestoneStatus === "rejected" ? "failed" : campaign.status;

    await sql`
      UPDATE milestones
      SET status = ${newMilestoneStatus}, resolved_at = ${now}
      WHERE id = ${mid}
    `;

    if (newCampaignStatus !== campaign.status) {
      await sql`UPDATE campaigns SET status = ${newCampaignStatus} WHERE id = ${id}`;
    }

    const [updatedCampaign] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    const [updatedMilestone] = await sql`SELECT * FROM milestones WHERE id = ${mid}`;
    return NextResponse.json({ milestone: updatedMilestone, campaign: updatedCampaign, tx_hash });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
