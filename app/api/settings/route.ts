import { NextRequest, NextResponse } from "next/server";
import { UpdateUserSettingsInputSchema } from "@/lib/validation";
import { readProjectSettings, writeProjectSettings } from "@/lib/utils/project-settings-operations";
import { discoverOrchestrationCatalog, normalizeOrchestrationSettings } from "@/lib/utils/orchestration-settings";
import { getCurrentProjectRoot } from "@/lib/utils/file-operations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projectRoot = await getCurrentProjectRoot();
    const [settingsEnvelope, catalog] = await Promise.all([
      readProjectSettings(projectRoot),
      discoverOrchestrationCatalog(projectRoot),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...settingsEnvelope,
        settings: {
          ...settingsEnvelope.settings,
          orchestration: normalizeOrchestrationSettings(settingsEnvelope.settings.orchestration, catalog),
        },
        catalog,
      },
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
    const projectRoot = await getCurrentProjectRoot();
    const currentEnvelope = await readProjectSettings(projectRoot);
    const updatedEnvelope = await writeProjectSettings({
      ...currentEnvelope.settings,
      ...validatedInput,
      orchestration: validatedInput.orchestration ?? currentEnvelope.settings.orchestration,
    }, projectRoot);
    const catalog = await discoverOrchestrationCatalog(projectRoot);

    return NextResponse.json({
      success: true,
      data: {
        ...updatedEnvelope,
        settings: {
          ...updatedEnvelope.settings,
          orchestration: normalizeOrchestrationSettings(updatedEnvelope.settings.orchestration, catalog),
        },
        catalog,
      },
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
