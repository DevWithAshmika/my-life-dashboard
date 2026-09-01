import { Loader2 } from "lucide-react";

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  icon: Icon,
  className = "",
}) {
  const variants = {
    primary:
      "bg-white text-black hover:bg-white/90",

    secondary:
      "bg-white/[0.06] text-white border border-white/10 hover:bg-white/[0.1]",

    ghost:
      "bg-transparent text-white/50 hover:bg-white/[0.06] hover:text-white",

    danger:
      "bg-white/[0.05] text-white/60 border border-white/10 hover:bg-white/[0.1]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`press flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {loading ? (
        <Loader2
          size={16}
          className="animate-spin"
        />
      ) : (
        Icon && <Icon size={16} />
      )}

      {children}
    </button>
  );
}