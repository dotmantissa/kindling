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
    const { voter_address, approve } = await req.json();

    if (!voter_address || typeof approve !== "boolean") {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const [campaign] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [milestone] = await sql`
      SELECT * FROM milestones WHERE id = ${mid} AND campaign_id = ${id}
    `;
    if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    if (milestone.status !== "voting") {
      return NextResponse.json({ error: "Not in voting state" }, { status: 400 });
    }

    // Check backer
    const [backer] = await sql`
      SELECT * FROM backers
      WHERE campaign_id = ${id} AND LOWER(backer_address) = LOWER(${voter_address})
    `;
    if (!backer) {
      return NextResponse.json({ error: "Only backers can vote" }, { status: 403 });
    }

    if (isContractDeployed()) {
      const client = getGenLayerClient();
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "cast_vote",
        args: [campaign.contract_id, milestone.contract_milestone_id, approve],
      });
      await client.waitForTransactionReceipt({
        hash: tx,
        status: TransactionStatus.FINALIZED,
      });

      // Sync vote tallies from chain
      const chainMilestones = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_milestones",
        args: [campaign.contract_id],
      }) as Array<{ id: string; votes_approve: string; votes_reject: string }>;

      const chainM = chainMilestones.find(
        (m) => m.id === milestone.contract_milestone_id
      );
      if (chainM) {
        await sql`
          UPDATE milestones
          SET votes_approve = ${chainM.votes_approve},
              votes_reject = ${chainM.votes_reject}
          WHERE id = ${mid}
        `;
      }
    } else {
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
    }

    const [updated] = await sql`SELECT * FROM milestones WHERE id = ${mid}`;
    return NextResponse.json({ milestone: updated });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
