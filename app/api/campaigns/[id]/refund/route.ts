import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getGenLayerClient, CONTRACT_ADDRESS, isContractDeployed } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { backer_address } = await req.json();

    const [campaign] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!["failed", "cancelled"].includes(campaign.status)) {
      return NextResponse.json({ error: "Campaign not eligible for refund" }, { status: 400 });
    }

    const [backer] = await sql`
      SELECT * FROM backers
      WHERE campaign_id = ${id} AND LOWER(backer_address) = LOWER(${backer_address})
    `;
    if (!backer) return NextResponse.json({ error: "No backing found" }, { status: 404 });
    if (backer.refunded) return NextResponse.json({ error: "Already refunded" }, { status: 400 });

    const now = new Date().toISOString();

    if (isContractDeployed()) {
      const client = getGenLayerClient();
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "claim_refund",
        args: [campaign.contract_id, now],
      });
      await client.waitForTransactionReceipt({
        hash: tx,
        status: TransactionStatus.FINALIZED,
      });
    }

    await sql`
      UPDATE backers SET refunded = true WHERE id = ${backer.id}
    `;

    return NextResponse.json({ refunded: true, amount_wei: backer.amount_wei });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
