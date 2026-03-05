"use client";

const CHIPS = [
  "Plan my day",
  "What's most important?",
  "Add a task",
  "Reschedule everything",
];

interface QuickChipsProps {
  onSelect: (text: string) => void;
  disabled: boolean;
}

export function QuickChips({ onSelect, disabled }: QuickChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map((chip) => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          disabled={disabled}
          className="rounded-full border border-border bg-surface/50 px-3 py-1.5 text-xs text-muted transition-colors hover:border-violet/50 hover:text-foreground disabled:opacity-30"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
