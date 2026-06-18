import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [campaign] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    const milestones = await sql`
      SELECT * FROM milestones WHERE campaign_id = ${id} ORDER BY order_index
    `;
    const backers = await sql`
      SELECT * FROM backers WHERE campaign_id = ${id} ORDER BY backed_at DESC
    `;
    return NextResponse.json({ campaign, milestones, backers });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
