export default function Toast({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 flex justify-center px-4"
    >
      <p className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg">{message}</p>
    </div>
  );
}
