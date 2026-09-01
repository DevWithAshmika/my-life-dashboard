import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#111] p-6 shadow-2xl">

        <div className="mb-6 flex items-center justify-between">

          <h2 className="text-xl font-semibold">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/40 hover:bg-white/10"
          >
            <X size={18} />
          </button>

        </div>

        {children}

      </div>

    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-xs text-white/40">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/20"
      />
    </div>
  );
}

export function Submit({ text }) {
  return (
    <button
      type="submit"
      className="w-full rounded-xl bg-white py-3.5 text-sm font-semibold text-black"
    >
      {text}
    </button>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-40 items-center justify-center">

      <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-white" />

    </div>
  );
}

export function Empty({ text }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] text-sm text-white/30">
      {text}
    </div>
  );
}

export function Stat({
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">

      <p className="text-xs text-white/30">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold">
        {value}
      </p>

    </div>
  );
}

export function MiniStat({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3">

      <p className="text-[10px] text-white/30">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold">
        {value}
      </p>

    </div>
  );
}