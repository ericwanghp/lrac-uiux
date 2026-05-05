import { NextRequest, NextResponse } from "next/server";
import { normalizeCommunicationSettings } from "@/lib/types/settings";
import { UpdateUserSettingsInputSchema } from "@/lib/validation";
import { readProjectSettings, writeProjectSettings } from "@/lib/utils/project-settings-operations";
import { discoverOrchestrationCatalog, normalizeOrchestrationSettings } from "@/lib/utils/orchestration-settings";
import { PROJECT_ROOT } from "@/lib/utils/file-operations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const [settingsEnvelope, catalog] = await Promise.all([
      readProjectSettings(projectRoot),
      discoverOrchestrationCatalog(PROJECT_ROOT),
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
    const projectRoot = request.nextUrl.searchParams.get("project");
    const currentEnvelope = await readProjectSettings(projectRoot);
    const updatedEnvelope = await writeProjectSettings({
      ...currentEnvelope.settings,
      ...validatedInput,
      communication: validatedInput.communication
        ? normalizeCommunicationSettings(validatedInput.communication)
        : currentEnvelope.settings.communication,
      orchestration: validatedInput.orchestration ?? currentEnvelope.settings.orchestration,
    }, projectRoot);
    const catalog = await discoverOrchestrationCatalog(PROJECT_ROOT);

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
