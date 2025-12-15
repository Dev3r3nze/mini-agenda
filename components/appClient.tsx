// components/AppClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragCancelEvent,
  pointerWithin,
} from "@dnd-kit/core";
import {
  initFirebase,
  listTasksForDate,
  listUnassignedTasks,
  subscribeToAuthChanges,
  type User,
} from "@/lib/firebase";
import Sidebar from "./sidebar";
import Calendar from "./calendar";
import LoginSignup from "./loginSingup";
import TasksPanel, { Task } from "./tasksPanel";
import { updateTask } from "@/lib/firebase"; // Asegúrate de que la ruta es correcta
import { formatKey } from "@/lib/firebase";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export default function AppClient() {
   // auth & selection
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>("");

  // tareas: sin asignar (panel izquierdo) y del día (sidebar)
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([]);
  const [dayTasks, setDayTasks] = useState<Task[]>([]);

  // overlay drag
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // --- funciones de carga (declaradas antes del useEffect para evitar TDZ) ---

  // Carga tareas globales (sin fecha)
  const loadGlobalTasks = async () => {
    try {
      const data = await listUnassignedTasks();
      const normalized = (data ?? []).map((r: any) => ({
        id: r.id,
        text: r.text ?? r.title ?? "",
        completed: !!r.completed,
        order: typeof r.order === "number" ? r.order : 0,
        dateKey: r.dateKey ?? null,
      }));
      // ordenar por order
      normalized.sort((a: Task, b: Task) => (a.order ?? 0) - (b.order ?? 0));
      setUnassignedTasks(normalized);
      console.log("Tareas globales cargadas:", normalized);
    } catch (err) {
      console.error("loadGlobalTasks error:", err);
    }
  };

  // Carga tareas del día seleccionado
  const loadSidebarTasks = async () => {
    try {
      const key = formatKey(selectedDate);
      const rows = await listTasksForDate(key);
      const normalized = (rows ?? []).map((r: any) => ({
        id: r.id,
        text: r.text ?? r.title ?? "",
        completed: !!r.completed,
        order: typeof r.order === "number" ? r.order : 0,
        dateKey: r.dateKey ?? key,
      }));
      normalized.sort((a: Task, b: Task) => (a.order ?? 0) - (b.order ?? 0));
      setDayTasks(normalized);
      console.log("Tareas del día cargadas:", normalized);
    } catch (err) {
      console.error("loadSidebarTasks error:", err);
    }
  };

  // findTaskById busca en ambas listas
  function findTaskById(id: string) {
    return (
      unassignedTasks.find((t) => t.id === id) ||
      dayTasks.find((t) => t.id === id) ||
      null
    );
  }

  // --- inicialización de Firebase y carga inicial ---
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function initAndLoad() {
      try {
        await initFirebase(firebaseConfig);

        if (cancelled) return;

        // subscribe auth
        unsubscribe = subscribeToAuthChanges((user) => {
          setCurrentUser(user);
        });

        // Espera adicional de 1s
        await new Promise((res) => setTimeout(res, 1000));

        if (cancelled) return;
        // cargar datos ahora que firebase está listo
        await loadGlobalTasks();
        await loadSidebarTasks();
      } catch (err) {
        console.error("Error inicializando Firebase:", err);
      }
    }

    initAndLoad();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // se ejecuta una vez

  // cuando cambia la fecha seleccionada, recargar tareas del día
  useEffect(() => {
    loadSidebarTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // --- funciones para asignar / desasignar tareas ---
  async function assignTaskToDate(taskId: string, dateKey: string) {
    try {
      await updateTask(taskId, { dateKey });
    } catch (err) {
      console.error("Error assignTaskToDate:", err);
      throw err;
    }
  }

  async function unassignTask(taskId: string) {
    try {
      await updateTask(taskId, { dateKey: null });
    } catch (err) {
      console.error("Error unassignTask:", err);
      throw err;
    }
  }

  // --- DnD handlers ---
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = String(active.id);
    const overId = String(over.id);

    try {
      if (overId === "day-tasks-dropzone") {
        const key = formatKey(selectedDate);
        await assignTaskToDate(taskId, key);
        // recargar ambas listas para reflejar el cambio inmediatamente
        await Promise.all([loadSidebarTasks(), loadGlobalTasks()]);
      } else if (overId === "unassigned-list") {
        await unassignTask(taskId);
        await Promise.all([loadSidebarTasks(), loadGlobalTasks()]);
      } else {
        // si overId es otro id (por ejemplo reordenamiento dentro de mismo container),
        // no hacemos nada aquí; los componentes Sortable pueden manejar reorden.
      }
    } catch (err) {
      console.error("handleDragEnd error:", err);
    } finally {
      setActiveTask(null);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const t = findTaskById(id);
    setActiveTask(t);
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveTask(null);
  }

  // --- render / control de auth ---
  if (currentUser === undefined) {
    return <div className="loading-screen">Cargando autenticación...</div>;
  }

  if (!currentUser || !currentUser.emailVerified) {
    return <LoginSignup currentUser={currentUser} />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <main className="flex-1 flex overflow-hidden">
        <DndContext
          collisionDetection={pointerWithin}
          onDragStart={(event) => {
            const task = findTaskById(event.active.id as string);
            setActiveTask(task ?? null);
          }}
          onDragEnd={(event) => {
            handleDragEnd(event);
            setActiveTask(null);
          }}
          onDragCancel={() => setActiveTask(null)}
        >
          <div className="w-full md:w-80 border-r border-border bg-card">
            <TasksPanel />
          </div>

          <div className="flex-1 p-6 md:p-8 overflow-auto">
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>

          <aside className="w-full md:w-80 border-l border-border bg-card">
            <Sidebar
              selectedDate={selectedDate}
              notes={notes}
              onNotesChange={setNotes}
            />
          </aside>
          <DragOverlay>
            {activeTask ? (
              <div className="p-2 bg-card border rounded shadow">
                {activeTask.text}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}
