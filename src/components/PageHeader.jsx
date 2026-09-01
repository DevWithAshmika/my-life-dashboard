export default function PageHeader({
  title,
  description,
  action,
  eyebrow,
}) {
  return (
    <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

      <div>

        {eyebrow && (
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
            {eyebrow}
          </p>
        )}

        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">
            {description}
          </p>
        )}

      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}

    </div>
  );
}