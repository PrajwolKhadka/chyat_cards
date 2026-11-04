import type { ReactNode } from "react";
import PrayerFlags from "./PrayerFlags";

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <PrayerFlags />
      <div className="flex flex-1 flex-col justify-center gap-6 px-5 py-8">{children}</div>
    </main>
  );
}
