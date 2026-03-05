"use client";

export default function CalendarPage() {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center px-4 py-20">
      <h1
        className="text-xl font-bold text-foreground"
        style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
      >
        Calendar
      </h1>
      <p className="mt-2 text-sm text-muted">
        Week and month view coming in Phase 2.
      </p>
    </div>
  );
}
