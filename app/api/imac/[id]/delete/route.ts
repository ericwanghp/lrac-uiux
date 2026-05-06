import { NextResponse } from "next/server";
import { deleteImacSession } from "@/lib/services/imac-session-manager";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteImacSession(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete IMAC session" },
      { status: 500 }
    );
  }
}
