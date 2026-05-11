"use client";

interface StatusIndicatorProps {
  /** Tailwind bg-* color class for the dot, e.g. "bg-green-500" */
  colorClass: string;
  label: string;
  /** Optional extra content rendered on the right side of the bar */
  trailing?: React.ReactNode;
}

/**
 * A small coloured dot + label row used to show connection / room status.
 *
 * Usage:
 * ```tsx
 * <StatusIndicator colorClass="bg-green-500" label="Connected" />
 * ```
 */
export default function StatusIndicator({
  colorClass,
  label,
  trailing,
}: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorClass}`}
      />
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      {trailing && (
        <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-600 font-mono">
          {trailing}
        </span>
      )}
    </div>
  );
}
