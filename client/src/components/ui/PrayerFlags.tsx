const FLAGS = ["#1565c0", "#fffdf7", "#c8102e", "#2e7d32", "#f4b400"];

export default function PrayerFlags() {
  return (
    <div aria-hidden className="w-full border-t-2 border-ink/40 drop-shadow-sm">
      <div className="flex w-full justify-between px-1">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className="h-6 w-5"
            style={{
              background: FLAGS[i % FLAGS.length],
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
