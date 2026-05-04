import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setMemberPassword } from "@/lib/utils/member-auth-operations";

export const dynamic = "force-dynamic";

const SetPasswordSchema = z.object({
  memberId: z.string().min(1),
  password: z.string().min(6),
  projectRoot: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = SetPasswordSchema.parse(await request.json());
    await setMemberPassword({
      projectRoot: body.projectRoot,
      memberId: body.memberId,
      password: body.password,
    });
    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to set password" },
      { status: 400 }
    );
  }
}
