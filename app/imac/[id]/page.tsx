import { getImacSession } from "@/lib/services/imac-session-manager";
import { ImacDetailClient } from "./imac-detail-client";

export const dynamic = "force-dynamic";

export default async function ImacDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getImacSession(id);

  if (!session) {
    return (
      <div className="admin-page">
        <div className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">IMAC session not found</p>
        </div>
      </div>
    );
  }

  return <ImacDetailClient session={session} />;
}
