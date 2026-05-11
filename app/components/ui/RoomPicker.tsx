"use client";

interface RoomPickerProps {
  roomInput: string;
  onRoomInputChange: (value: string) => void;
  onJoin: () => void;
  description: string;
  placeholder?: string;
  /** Extra description lines rendered below the main description */
  extraDescription?: React.ReactNode;
  /** Tailwind classes for the Join button. Defaults to emerald. */
  buttonColorClass?: string;
  /** Tailwind focus-ring class for the text input. */
  focusRingClass?: string;
}

/**
 * A room-name input + Join button panel shared by WebRTC components.
 */
export default function RoomPicker({
  roomInput,
  onRoomInputChange,
  onJoin,
  description,
  placeholder = "e.g. my-room",
  extraDescription,
  buttonColorClass = "bg-emerald-600 hover:bg-emerald-700",
  focusRingClass = "focus:ring-emerald-500",
}: RoomPickerProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onJoin();
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 py-12">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-xs">
        {description}
      </p>
      {extraDescription}
      <div className="flex gap-2 w-full max-w-sm">
        <input
          type="text"
          value={roomInput}
          onChange={(e) => onRoomInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 ${focusRingClass}`}
        />
        <button
          onClick={onJoin}
          disabled={!roomInput.trim()}
          className={`rounded-xl ${buttonColorClass} px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
        >
          Join
        </button>
      </div>
    </div>
  );
}
