import { NextResponse } from "next/server";
import { getImacSession } from "@/lib/services/imac-session-manager";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getImacSession(id);
    if (!session) {
      return NextResponse.json({ success: false, error: "IMAC session not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get IMAC session" },
      { status: 500 }
    );
  }
}
