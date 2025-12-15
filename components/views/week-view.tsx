"use client";

interface WeekViewProps {
  date: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;

  weeklyNotes: Record<string, { text: string } | null>;
}

export default function WeekView({
  date,
  selectedDate,
  onDateSelect,
  weeklyNotes,
}: WeekViewProps) {
  const getWeekStart = (d: Date) => {
    const newDate = new Date(d);
    const day = newDate.getDay();
    const diff = newDate.getDate() - day + 1;
    return new Date(newDate.setDate(diff));
  };

  const formatKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const weekStart = getWeekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const isSelected = (d: Date) => {
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden ">
      <div className="grid grid-cols-7 divide-x divide-border h-[70vh]">
        {days.map((day, index) => {
          const key = formatKey(day);
          const note = weeklyNotes[key];

          return (
            <div
              key={index}
              className={`p-4 min-h-96 border-b border-border last:border-b-0 ${
                isToday(day) ? "bg-muted" : ""
              }`}
            >
              <button
                onClick={() => onDateSelect(day)}
                className={`w-full text-sm font-medium py-2 px-3 rounded-lg mb-4 transition-all duration-200 ${
                  isSelected(day)
                    ? "bg-accent text-accent-foreground"
                    : isToday(day)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div>{day.toLocaleString("default", { weekday: "short" })}</div>
                <div className="text-lg">{day.getDate()}</div>
              </button>

              <div className="space-y-2 h-80 overflow-y-auto">
                {note && note.text && note.text.trim() !== "" ? (
                  <div className="space-y-2">
                    {note.text
                      .split("\n")
                      .map((line, i) => line.trim())
                      .filter((line) => line !== "")
                      .map((line, i) => (
                        <div
                          key={i}
                          className="bg-accent/20 text-foreground text-xs p-2 rounded-md"
                        >
                          {line}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    No events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
