"use client";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  /**
   * Tailwind classes for the Send button background / hover state.
   * Defaults to blue (WebSocket style).
   */
  buttonColorClass?: string;
  /**
   * Tailwind focus-ring class for the text input.
   * Defaults to blue (WebSocket style).
   */
  focusRingClass?: string;
}

/**
 * A text input + Send button row used at the bottom of a chat panel.
 * Pressing Enter also triggers `onSend`.
 */
export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = "Type a message…",
  buttonColorClass = "bg-blue-600 hover:bg-blue-700",
  focusRingClass = "focus:ring-blue-500 dark:focus:ring-blue-400",
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSend();
  };

  return (
    <div className="flex gap-2 mt-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 ${focusRingClass} disabled:opacity-50`}
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className={`rounded-xl ${buttonColorClass} px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
      >
        Send
      </button>
    </div>
  );
}
