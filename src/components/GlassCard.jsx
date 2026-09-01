export default function GlassCard({
  children,
  className = "",
  hover = false,
}) {
  return (
    <div
      className={`glass glass-shadow rounded-[28px] ${
        hover ? "glass-hover" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}