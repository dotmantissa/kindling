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
    if (milestone.status !== "voting") {
      return NextResponse.json({ error: "Not in voting state" }, { status: 400 });
    }

    const now = new Date().toISOString();
    let newMilestoneStatus: string;
    let newCampaignStatus = campaign.status;

    if (isContractDeployed()) {
      const client = getGenLayerClient();
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "finalize_vote",
        args: [campaign.contract_id, milestone.contract_milestone_id, now],
      });
      await client.waitForTransactionReceipt({
        hash: tx,
        status: TransactionStatus.FINALIZED,
      });

      const chainMilestones = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_milestones",
        args: [campaign.contract_id],
      }) as Array<{ id: string; status: string }>;

      const chainM = chainMilestones.find(
        (m) => m.id === milestone.contract_milestone_id
      );
      newMilestoneStatus = chainM?.status || "rejected";

      const chainCampaign = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_campaign",
        args: [campaign.contract_id],
      }) as { status: string };
      newCampaignStatus = chainCampaign.status;
    } else {
      const approveVotes = BigInt(milestone.votes_approve || "0");
      const rejectVotes = BigInt(milestone.votes_reject || "0");
      newMilestoneStatus = approveVotes >= rejectVotes ? "approved" : "rejected";
      if (newMilestoneStatus === "rejected") newCampaignStatus = "failed";
    }

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
    return NextResponse.json({
      milestone: updatedMilestone,
      campaign: updatedCampaign,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
