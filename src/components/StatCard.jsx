import GlassCard from "./GlassCard";

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = "neutral",
}) {
  const trendClass =
    trendType === "positive"
      ? "text-white"
      : trendType === "negative"
        ? "text-white/45"
        : "text-white/30";

  return (
    <GlassCard
      hover
      className="relative overflow-hidden p-5"
    >
      <div className="flex items-start justify-between">

        <div className="min-w-0">

          <p className="text-xs font-medium text-white/35">
            {title}
          </p>

          <p className="mt-3 truncate text-2xl font-semibold tracking-tight text-white">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1.5 text-[11px] text-white/25">
              {subtitle}
            </p>
          )}

        </div>

        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/60">
            <Icon size={18} strokeWidth={1.7} />
          </div>
        )}

      </div>

      {trend && (
        <div className={`mt-4 text-[11px] ${trendClass}`}>
          {trend}
        </div>
      )}
    </GlassCard>
  );
}