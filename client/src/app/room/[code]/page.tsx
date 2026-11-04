import { Suspense } from "react";
import Shell from "@/components/ui/Shell";
import RoomScreen from "@/features/room/RoomScreen";

async function RoomContent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomScreen code={code.toUpperCase()} />;
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense
      fallback={
        <Shell>
          <p className="text-center text-ink/60">Loading...</p>
        </Shell>
      }
    >
      <RoomContent params={params} />
    </Suspense>
  );
}