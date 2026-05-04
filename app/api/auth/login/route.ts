import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_SESSION_COOKIE_KEY } from "@/lib/constants/auth";
import { createAuthSession } from "@/lib/utils/member-auth-operations";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  memberId: z.string().min(1),
  password: z.string().min(1),
  projectRoot: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = LoginSchema.parse(await request.json());
    const session = await createAuthSession({
      projectRoot: body.projectRoot,
      memberId: body.memberId,
      password: body.password,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        member: session.member,
        projectRoot: session.projectRoot,
      },
    });
    response.cookies.set(AUTH_SESSION_COOKIE_KEY, session.token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 12,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to sign in" },
      { status: 400 }
    );
  }
}
