import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getGenLayerClient, CONTRACT_ADDRESS, isContractDeployed } from "@/lib/genlayer";

export async function POST() {
  if (!isContractDeployed()) {
    return NextResponse.json({ ok: false, message: "Contract not deployed yet" });
  }

  try {
    const client = getGenLayerClient();

    const chainCampaigns = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_all_campaigns",
      args: [],
    }) as Array<{
      id: string;
      creator: string;
      title: string;
      description: string;
      goal: string;
      raised: string;
      backer_count: string;
      deadline: string;
      image_url: string;
      category: string;
      status: string;
      created_at: string;
      milestone_count: string;
    }>;

    for (const c of chainCampaigns) {
      const [existing] = await sql`SELECT id FROM campaigns WHERE contract_id = ${c.id}`;
      if (existing) {
        await sql`
          UPDATE campaigns SET
            raised_wei = ${c.raised},
            backer_count = ${parseInt(c.backer_count)},
            status = ${c.status},
            milestone_count = ${parseInt(c.milestone_count)}
          WHERE contract_id = ${c.id}
        `;
      }

      const milestones = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: "get_milestones",
        args: [c.id],
      }) as Array<{
        id: string;
        status: string;
        votes_approve: string;
        votes_reject: string;
        evidence_url: string;
        evidence_description: string;
        submitted_at: string;
        resolved_at: string;
      }>;

      if (existing) {
        for (const m of milestones) {
          await sql`
            UPDATE milestones SET
              status = ${m.status},
              votes_approve = ${m.votes_approve},
              votes_reject = ${m.votes_reject},
              evidence_url = ${m.evidence_url || null},
              evidence_description = ${m.evidence_description || null},
              submitted_at = ${m.submitted_at || null},
              resolved_at = ${m.resolved_at || null}
            WHERE campaign_id = ${existing.id} AND contract_milestone_id = ${m.id}
          `;
        }
      }
    }

    return NextResponse.json({ ok: true, synced: chainCampaigns.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
