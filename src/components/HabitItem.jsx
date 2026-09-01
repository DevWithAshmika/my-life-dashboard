export default function HabitItem({
  title,
  progress,
}) {
  return (
    <div>

      <div className="mb-2 flex items-center justify-between">

        <span className="text-sm text-white/60">
          {title}
        </span>

        <span className="text-xs text-white/30">
          {progress}%
        </span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">

        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{
            width: `${progress}%`,
          }}
        />

      </div>

    </div>
  );
}