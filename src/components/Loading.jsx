export default function Loading({ text = "Loading..." }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />

        <p className="text-sm text-white/40">
          {text}
        </p>
      </div>
    </div>
  );
}