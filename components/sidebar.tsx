// components/Sidebar.tsx
"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  formatKey,
  listTasksForDate,
  loadNoteForDate,
  saveNoteForDate,
  updateTask,
} from "../lib/firebase";
import { firebaseInitialized } from "../lib/firebase";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTask, Task } from "./tasksPanel";
import { useDroppable } from "@dnd-kit/core";

interface SidebarProps {
  selectedDate: Date;
  notes: string;
  onNotesChange: (notes: string) => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  reload: () => Promise<void>;
}

export default function Sidebar({
  selectedDate,
  notes,
  onNotesChange,
  tasks,
  setTasks,
  reload,
}: SidebarProps) {
  const [localNotes, setLocalNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { setNodeRef } = useDroppable({
    id: "day-tasks-dropzone",
  });


  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // actualizar la hora cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000 * 60); // cada minuto
    return () => clearInterval(interval);
  }, []);

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleString("default", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString("default", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Madrid", // GMT+1 / CET
    });
  };

  // Cuando cambia la fecha seleccionada, cargar nota desde Firebase
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Espera a que Firebase esté inicializado y autenticado
        await firebaseInitialized;

        const key = formatKey(selectedDate);
        const res = await loadNoteForDate(key); // ahora db y uid existen
        if (!cancelled && mounted.current) {
          const text = res?.text ?? "";
          setLocalNotes(text);
          onNotesChange(text); // opcional si quieres sincronizar parent
        }
      } catch (err: any) {
        console.error("Error loading note:", err);
        if (!cancelled && mounted.current) setError("Error cargando nota");
      } finally {
        if (!cancelled && mounted.current) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, onNotesChange]);

  
 

  // toggle completado — correcto y evita stale state
  function toggleCompleted(id: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const newCompleted = !t.completed;
        updateTask(id, { completed: newCompleted }).catch((err) => {
          console.error("updateTask error:", err);
        });
        return { ...t, completed: newCompleted };
      })
    );
  }

  // controlar cambios locales
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNotes(e.target.value);
  };

  const deleteCompletedTasks = async () => {
    const completedTaskIds = tasks.filter((t) => t.completed).map((t) => t.id);
    await Promise.all(
      completedTaskIds.map((id) => updateTask(id, { dateKey: null }))
    );
  }

  // guardar en blur
  const handleBlur = async () => {
    // evitar guardar si no hay cambios
    try {
      setSaving(true);
      setError(null);

      // Espera a que Firebase esté inicializado y autenticado
      await firebaseInitialized;

      const key = formatKey(selectedDate);
      await saveNoteForDate(key, localNotes);

      onNotesChange(localNotes);
    } catch (err: any) {
      console.error("Error saving note:", err);
      setError("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Fecha */}
      <div className="mb-4">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Selected Date
        </h2>
        <div className="bg-muted rounded-lg p-4">
          <p className="text-lg font-medium">
            {selectedDate.toLocaleDateString("default", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="text-sm text-muted-foreground mt-1">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      {/* 🧲 TAREAS DEL DÍA (DROPPABLE) */}
      <div className="mb-4 flex flex-col overflow-hidden">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Tasks
        </h2>

        <div
          ref={setNodeRef}
          id="day-tasks-dropzone"
          className="flex-1 overflow-hidden hover:border-accent border border-dashed border-border rounded p-2"
        >
          {loading && (
            <p className="text-xs text-muted-foreground">Cargando tareas…</p>
          )}

          {!loading && tasks.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Arrastra tareas aquí
            </p>
          )}

          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2 select-none">
              {tasks.map((task) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onToggle={toggleCompleted}
                />
              ))}
            </div>
          </SortableContext>
        </div>
        {/* Botón de borrado de tareas completadas */}
        {tasks.some((t) => t.completed) && (
          <button
            onClick={async () => {
              await deleteCompletedTasks();
              setTasks((prev) => prev.filter((t) => !t.completed));
            }}
            className="mt-2 text-xs text-danger border hover:bg-accent hover:cursor-pointer border-danger rounded px-2 py-1 hover:bg-danger/10 transition-colors"
          >
            Borrar tareas completadas
          </button>
        )}

      </div>

      {/* 📝 NOTAS */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Notes
        </h2>

        <textarea
          value={localNotes}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Add your notes here..."
          className="flex-1 bg-muted border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
        />

        {loading && <div className="text-xs mt-2">Cargando…</div>}
        {saving && <div className="text-xs mt-2">Guardando…</div>}
        {error && <div className="text-xs text-danger mt-2">{error}</div>}
      </div>

      {/* Tip */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          💡 Arrastra tareas desde la lista izquierda al día seleccionado.
        </p>
      </div>
    </div>
  );
}
