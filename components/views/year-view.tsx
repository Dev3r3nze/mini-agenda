"use client";

interface YearViewProps {
  date: Date;
  selectedDate: Date;
  onDateSelect: (d: Date) => void;
  notes: Record<string, { text: string } | null>

}

export default function YearView({
  date,
  selectedDate,
  onDateSelect,
  notes,
}: YearViewProps) {
  const year = date.getFullYear();
  const today = new Date();

  const months = Array.from({ length: 12 }, (_, i) => {
    const monthDate = new Date(year, i, 1);
    return {
      index: i,
      name: monthDate.toLocaleString("default", { month: "short" }),
      daysInMonth: new Date(year, i + 1, 0).getDate(),
    };
  });

  const getDaysInMonth = (monthIndex: number) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (monthIndex: number) => {
    return new Date(year, monthIndex, 1).getDay();
  };

  const isToday = (monthIndex: number, day: number) => {
    return (
      day === today.getDate() &&
      monthIndex === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const hasNote = (monthIndex: number, day: number) => {
    const target = new Date(year, monthIndex, day+1).toISOString().split("T")[0];
    return notes[target] !== undefined && notes[target] !== null;
  };

  const isSelected = (monthIndex: number, day: number) => {
    return (
      day === selectedDate.getDate() &&
      monthIndex === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 scrollbar overflow-y-auto md:max-h-[60vh] xl:max-h-[75vh] p-2"
      id="scrollbar-custom"
    >
      {months.map((month) => (
        <div
          key={month.index}
          className="bg-card rounded-lg p-4 border border-border"
        >
          <h3 className="text-sm font-medium text-foreground mb-3">
            {month.name} {year}
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <div
                key={day}
                className="text-center text-xs text-muted-foreground py-1 font-medium"
              >
                {day}
              </div>
            ))}
            {Array(getFirstDayOfMonth(month.index))
              .fill(null)
              .map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
            {Array.from(
              { length: getDaysInMonth(month.index) },
              (_, i) => i + 1
            ).map((day) => (
              <button
                key={`${month.index}-${day}`}
                onClick={() => onDateSelect(new Date(year, month.index, day))}
                className={`aspect-square flex flex-col items-center justify-center text-xs rounded transition-all duration-200 ${
                  isSelected(month.index, day)
                    ? "bg-accent text-accent-foreground"
                    : isToday(month.index, day)
                    ? "bg-muted text-foreground ring-1 ring-accent"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {hasNote(month.index, day) && (
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mb-0.5"></div>
                )}
                {day}
                
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
