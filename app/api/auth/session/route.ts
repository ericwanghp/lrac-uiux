import { NextRequest, NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE_KEY } from "@/lib/constants/auth";
import { getCurrentAuthSession, deleteAuthSession } from "@/lib/utils/member-auth-operations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const session = await getCurrentAuthSession(projectRoot);
    return NextResponse.json({
      success: true,
      data: {
        member: session.member,
        projectRoot: session.projectRoot,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load session" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const projectRoot = request.nextUrl.searchParams.get("project");
    const token = request.cookies.get(AUTH_SESSION_COOKIE_KEY)?.value;
    if (token) {
      await deleteAuthSession(token, projectRoot);
    }
    const response = NextResponse.json({ success: true, data: { signedOut: true } });
    response.cookies.set(AUTH_SESSION_COOKIE_KEY, "", {
      path: "/",
      expires: new Date(0),
      httpOnly: true,
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to sign out" },
      { status: 500 }
    );
  }
}
