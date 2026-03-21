import { NextRequest, NextResponse } from "next/server";
import { UpdateUserSettingsInputSchema } from "@/lib/validation";
import { readProjectSettings, writeProjectSettings } from "@/lib/utils/project-settings-operations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settingsEnvelope = await readProjectSettings();

    return NextResponse.json({
      success: true,
      data: settingsEnvelope,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load settings",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedInput = UpdateUserSettingsInputSchema.parse(body);
    const currentEnvelope = await readProjectSettings();
    const updatedEnvelope = await writeProjectSettings({
      ...currentEnvelope.settings,
      ...validatedInput,
    });

    return NextResponse.json({
      success: true,
      data: updatedEnvelope,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update settings",
      },
      { status: 400 }
    );
  }
}
