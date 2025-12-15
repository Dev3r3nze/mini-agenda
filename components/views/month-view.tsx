"use client"

interface MonthViewProps {
  date: Date
  selectedDate: Date
  onDateSelect: (date: Date) => void
  notes: Record<string, { text: string } | null>

}

export default function MonthView({ date, selectedDate, onDateSelect, notes }: MonthViewProps) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const isToday = (day: number) => {
    const today = new Date()
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
  }

  const isSelected = (day: number) => {
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()
  }

   const hasNote = (day: number) => {
    const target = new Date(year, month, day+1).toISOString().split("T")[0];
    return notes[target] !== undefined && notes[target] !== null;
  };

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <div className="grid grid-cols-7 gap-2 mb-4 border-b pb-2">
        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-3">
            {day.slice(0, 3)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 border-b scrollbar overflow-y-auto md:max-h-[40vh] xl:max-h-[65vh] pb-2" id="scrollbar-custom">
        {Array(firstDay)
          .fill(null)
          .map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
          <button
            key={day}
            onClick={() => onDateSelect(new Date(year, month, day))}
            className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 ${
              isSelected(day)
                ? "bg-accent text-accent-foreground"
                : isToday(day)
                  ? "bg-muted text-foreground ring-1 ring-accent"
                  : "text-foreground hover:bg-muted"
            }`}
          >
            {/* punto indicador */}
            {hasNote(day) && (
              <div className="w-1.5 h-1.5 rounded-full bg-accent mb-0.5"></div>
            )}

            {day}
            
          </button>
        ))}
      </div>
    </div>
  )
}
