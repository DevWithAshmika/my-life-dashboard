import { Check } from "lucide-react";

export default function TaskItem({
  title,
  completed = false,
  priority = "Normal",
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.025] p-3">

      <button
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
          completed
            ? "border-white bg-white text-black"
            : "border-white/20"
        }`}
      >
        {completed && <Check size={13} />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            completed
              ? "text-white/30 line-through"
              : "text-white/70"
          }`}
        >
          {title}
        </p>
      </div>

      <span className="rounded-full bg-white/5 px-2 py-1 text-[9px] text-white/40">
        {priority}
      </span>

    </div>
  );
}