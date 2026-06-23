import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { getGenLayerClient, CONTRACT_ADDRESS, isContractDeployed } from "@/lib/genlayer";

const VERIFY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

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

    let synced = 0;
    for (const c of chainCampaigns) {
      const [existing] = await sql`SELECT id FROM campaigns WHERE contract_id = ${c.id}`;
      if (!existing) continue;

      await sql`
        UPDATE campaigns SET
          raised_wei = ${c.raised},
          backer_count = ${parseInt(c.backer_count)},
          status = ${c.status},
          milestone_count = ${parseInt(c.milestone_count)}
        WHERE contract_id = ${c.id}
      `;
      synced++;

      // Sync milestones individually using get_milestone(campaign_id, milestone_id)
      const milestoneCount = parseInt(c.milestone_count);
      for (let i = 0; i < milestoneCount; i++) {
        const mContractId = `m${i}`;
        try {
          const chainM = await client.readContract({
            address: CONTRACT_ADDRESS,
            functionName: "get_milestone",
            args: [c.id, mContractId],
          }) as {
            id: string;
            status: string;
            votes_approve: string;
            votes_reject: string;
            evidence_url: string;
            evidence_description: string;
            submitted_at: string;
            resolved_at: string;
          };

          if (chainM && chainM.id) {
            const [existingM] = await sql`
              SELECT status, resolved_at FROM milestones
              WHERE campaign_id = ${existing.id} AND contract_milestone_id = ${mContractId}
            `;

            // Determine whether to preserve "verifying" while the AI tx is still pending
            const isPreservingVerifying =
              chainM.status === "submitted" && existingM?.status === "verifying";

            let resolvedStatus = isPreservingVerifying ? "verifying" : chainM.status;

            // Auto-reset to "submitted" if verification has been stuck for >20 min.
            // Preserving the DB resolved_at (set when verification was triggered) lets
            // us detect this even after multiple sync rounds.
            if (isPreservingVerifying && existingM.resolved_at) {
              const triggeredAt = new Date(existingM.resolved_at).getTime();
              if (!isNaN(triggeredAt) && Date.now() - triggeredAt > VERIFY_TIMEOUT_MS) {
                resolvedStatus = "submitted";
              }
            }

            // When still verifying, keep our trigger timestamp; otherwise use chain value.
            const resolvedAt =
              resolvedStatus === "verifying"
                ? existingM.resolved_at
                : (chainM.resolved_at || null);

            await sql`
              UPDATE milestones SET
                status = ${resolvedStatus},
                votes_approve = ${chainM.votes_approve},
                votes_reject = ${chainM.votes_reject},
                evidence_url = ${chainM.evidence_url || null},
                evidence_description = ${chainM.evidence_description || null},
                submitted_at = ${chainM.submitted_at || null},
                resolved_at = ${resolvedAt}
              WHERE campaign_id = ${existing.id} AND contract_milestone_id = ${mContractId}
            `;
          }
        } catch (_) {
          // milestone may not exist on-chain yet if tx is still pending
        }
      }
    }

    return NextResponse.json({ ok: true, synced });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
