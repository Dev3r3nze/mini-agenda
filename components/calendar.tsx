"use client";

import { useState, useEffect } from "react";
import YearView from "./views/year-view";
import MonthView from "./views/month-view";
import WeekView from "./views/week-view";
import ViewSelector from "./view-selector";
import { loadNoteForDate } from "@/lib/firebase"; // <-- IMPORTANTE
import { auth } from "@/lib/firebase"; // tu instancia de Firebase Auth
import { onAuthStateChanged } from "firebase/auth";

type ViewType = "year" | "month" | "week";

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function Calendar({
  selectedDate,
  onDateSelect,
}: CalendarProps) {
  const [view, setView] = useState<ViewType>("month");
  const [displayDate, setDisplayDate] = useState(selectedDate);
  const [currentUser, setCurrentUser] = useState<any>(null); // tu lógica de usuario
  const [notes, setNotes] = useState<Record<string, { text: string } | null>>(
    {}
  ); // notas cargadas

  const [weeklyNotes, setWeeklyNotes] = useState<
    Record<string, { text: string } | null>
  >({});

  const handlePrevious = () => {
    const newDate = new Date(displayDate);
    if (view === "year") {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else if (view === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setDisplayDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(displayDate);
    if (view === "year") {
      newDate.setFullYear(newDate.getFullYear() + 1);
    } else if (view === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setDisplayDate(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setDisplayDate(today);
    onDateSelect(today);
  };

  const getStartOfWeek = (date: Date) => {
    const newDate = new Date(date);
    const day = newDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    newDate.setDate(newDate.getDate() + diff);
    return newDate;
  };

  const formatKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // 🔥 Cargar las notas de la semana actual
  useEffect(() => {
    if (view !== "week") return; // solo si estamos en vista semanal

    const start = getStartOfWeek(displayDate);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });

    const loadWeeklyNotes = async () => {
      const notes: Record<string, { text: string } | null> = {};

      for (const day of days) {
        const key = formatKey(day);

        try {
          const note = await loadNoteForDate(key);
          notes[key] = note as { text: string } | null; // null o { text }
        } catch (e) {
          console.warn("Error cargando nota de", key, e);
          notes[key] = null;
        }
      }

      setWeeklyNotes(notes);
    };

    loadWeeklyNotes();
  }, [displayDate, view]);
  // displayDate → al cambiar de semana
  // view → al entrar en vista semanal

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  const loadNotesForDates = async (dates: Date[]) => {
    if (!currentUser) {
      console.warn("No authenticated user, cannot load notes.");
      return;
    }

    const result: Record<string, { text: string } | null> = {};

    for (const day of dates) {
      const key = formatKey(day);
      // key = "YYYY-MM-DD"

      try {
        const note = await loadNoteForDate(key);
        result[key] = note ? { text: note.text } : null;
      } catch (e) {
        console.warn(`Error al cargar la nota del día ${key}`, e);
        result[key] = null;
      }
    }

    setNotes(result); // setNotes viene de tu estado global del calendario
  };

  // Cargar notas cuando cambie la fecha mostrada o el usuario
  useEffect(() => {
    if (!currentUser) return;

    let datesToLoad: Date[] = [];

    if (view === "month") {
      const year = displayDate.getFullYear();
      const month = displayDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= daysInMonth; day++) {
        datesToLoad.push(new Date(year, month, day));
      }
    } else if (view === "year") {
      const year = displayDate.getFullYear();

      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          datesToLoad.push(new Date(year, month, day));
        }
      }
    }

    loadNotesForDates(datesToLoad);
  }, [displayDate, view, currentUser]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between sm:flex-col sm:gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Mini Agenda</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {view === "year" && displayDate.getFullYear()}
            {view === "month" &&
              displayDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            {view === "week" &&
              `Week of ${getStartOfWeek(displayDate).toLocaleDateString()}`}
          </p>
        </div>
        <ViewSelector view={view} onViewChange={setView} />
        <div>
          <button
            onClick={handleToday}
            className="px-4 py-2 w-full rounded-lg bg-accent text-accent-foreground hover:cursor-pointer hover:bg-accent/80 transition-opacity text-sm font-medium"
          >
            Today
          </button>
          <div className="flex items-center gap-4 mb-6 mt-2">
            <button
              onClick={handlePrevious}
              className="p-2 hover:bg-muted rounded-lg transition-colors hover:cursor-pointer"
              aria-label="Previous"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-muted rounded-lg transition-colors hover:cursor-pointer"
              aria-label="Next"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="transition-all duration-300">
        {view === "year" && (
          <YearView
            date={displayDate}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            notes={notes}
          />
        )}
        {view === "month" && (
          <MonthView
            date={displayDate}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            notes={notes}
          />
        )}
        {view === "week" && (
          <WeekView
            date={displayDate}
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            weeklyNotes={weeklyNotes}
          />
        )}
      </div>
    </div>
  );
}
