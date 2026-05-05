import { NextResponse } from "next/server";
import {
  createImacSession,
  listImacSessions,
  storeImacAttachments,
} from "@/lib/services/imac-session-manager";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessions = await listImacSessions();
    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to list IMAC sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const title = String(formData.get("title") ?? "").trim();
    const abbreviation = String(formData.get("abbreviation") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const description = String(formData.get("description") ?? "").trim();
    const uploadedFiles = formData
      .getAll("referenceFiles")
      .filter((entry): entry is File => entry instanceof File);

    if (!title) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }
    if (!abbreviation) {
      return NextResponse.json({ success: false, error: "Abbreviation is required" }, { status: 400 });
    }

    const session = await createImacSession({ abbreviation, title, description });

    if (uploadedFiles.length > 0) {
      await storeImacAttachments(session.id, uploadedFiles);
    }

    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create IMAC session" },
      { status: 500 }
    );
  }
}
