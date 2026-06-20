import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getGenLayerClient, CONTRACT_ADDRESS, isContractDeployed } from "@/lib/genlayer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { backer_address, amount_wei } = await req.json();

    if (!backer_address || !amount_wei) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const [campaign] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (campaign.status !== "active") {
      return NextResponse.json({ error: "Campaign not accepting backing" }, { status: 400 });
    }

    const now = new Date().toISOString();
    let tx_hash = "";

    if (isContractDeployed()) {
      const client = getGenLayerClient();
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "back_campaign",
        args: [campaign.contract_id, amount_wei, now, backer_address],
      });
      tx_hash = tx;
    }

    const newRaisedWei = (BigInt(campaign.raised_wei) + BigInt(amount_wei)).toString();
    const newStatus = BigInt(newRaisedWei) >= BigInt(campaign.goal_wei) ? "funded" : campaign.status;

    await sql`
      INSERT INTO backers (id, campaign_id, backer_address, amount_wei, backed_at, tx_hash)
      VALUES (
        ${"backer_" + Date.now() + "_" + Math.random().toString(36).slice(2)},
        ${id}, ${backer_address}, ${amount_wei}, ${now}, ${tx_hash}
      )
      ON CONFLICT (campaign_id, backer_address)
      DO UPDATE SET
        amount_wei = (backers.amount_wei::numeric + ${amount_wei}::numeric)::text,
        tx_hash = EXCLUDED.tx_hash
    `;

    await sql`
      UPDATE campaigns
      SET raised_wei = ${newRaisedWei},
          backer_count = (SELECT COUNT(*) FROM backers WHERE campaign_id = ${id}),
          status = ${newStatus}
      WHERE id = ${id}
    `;

    const [updated] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    return NextResponse.json({ campaign: updated, tx_hash });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
