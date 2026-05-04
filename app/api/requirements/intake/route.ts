import { NextResponse } from "next/server";
import {
  readRequirementsIntake,
  saveRequirementsIntake,
  storeRequirementReferenceFiles,
} from "@/lib/utils/requirements-intake";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const intake = await readRequirementsIntake();
    return NextResponse.json({ success: true, data: intake });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load requirements intake",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const description = String(formData.get("description") ?? "").trim();
    const uploadedFiles = formData
      .getAll("referenceFiles")
      .filter((entry): entry is File => entry instanceof File);

    if (!description) {
      return NextResponse.json(
        { success: false, error: "Requirement description is required" },
        { status: 400 }
      );
    }

    const existing = await readRequirementsIntake();
    const newReferences = await storeRequirementReferenceFiles(uploadedFiles);
    const intake = await saveRequirementsIntake({
      description,
      references: [...existing.references, ...newReferences],
    });

    return NextResponse.json({
      success: true,
      data: intake,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save requirements intake",
      },
      { status: 500 }
    );
  }
}
