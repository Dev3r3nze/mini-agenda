"use client"

interface ViewSelectorProps {
  view: "year" | "month" | "week"
  onViewChange: (view: "year" | "month" | "week") => void
}

export default function ViewSelector({ view, onViewChange }: ViewSelectorProps) {
  const views = [
    { id: "year", label: "Year" },
    { id: "month", label: "Month" },
    { id: "week", label: "Week" },
  ]

  return (
    <div className="flex gap-2 bg-muted rounded-lg p-1 w-fit ">
      {views.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onViewChange(id as "year" | "month" | "week")}
          className={`px-4 cursor-pointer py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            view === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
