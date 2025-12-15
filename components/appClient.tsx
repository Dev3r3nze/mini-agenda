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

import Calendar from "./calendar";
import TasksPanel from "./tasksPanel";
import Sidebar from "./sidebar";

import LoginSignup from "./loginSingup";

import {
  initFirebase,
  subscribeToAuthChanges,
  formatKey,
  type User,
} from "@/lib/firebase";

import type { Task } from "./tasksPanel";

import {
  listUnassignedTasks,
  listTasksForDate,
  updateTask,
} from "@/lib/firebase";

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
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(
    undefined
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>("");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

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

        // espera adicional de 1 segundo para evitar parpadeos
        await new Promise((res) => setTimeout(res, 1000));

        // subscribe auth
        unsubscribe = subscribeToAuthChanges((user) => {
          setCurrentUser(user);
        });

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

  // --- JSX: DndContext + DragOverlay ---
  return (
    <div className="flex h-screen bg-background text-foreground">
      <main className="flex-1 flex overflow-hidden">
        <DndContext
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {/* 🔘 BOTÓN SIDEBAR IZQUIERDO (MÓVIL) */}
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className="md:hidden fixed bottom-4 left-4 z-50 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow"
          >
            🗂
          </button>

          {/* 🔘 BOTÓN SIDEBAR DERECHO (MÓVIL) */}
          <button
            onClick={() => setRightOpen(!rightOpen)}
            className="md:hidden fixed bottom-4 right-4 z-50 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow"
          >
            📝
          </button>

          {/* Panel izquierdo */}
          <div
            className={`
              fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border
              transform transition-transform duration-300
              ${leftOpen ? "translate-x-0" : "-translate-x-full"}
              md:static md:translate-x-0 md:w-80
            `}
          >
            <TasksPanel
              tasks={unassignedTasks}
              setTasks={setUnassignedTasks}
              reload={loadGlobalTasks}
            />
          </div>

          {/* Calendario */}
          <div className="flex-1 p-6 md:p-8 overflow-auto">
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>

          {/* Sidebar derecho */}
          <aside
            className={`
              fixed inset-y-0 right-0 z-40 w-72 bg-card border-l border-border
              transform transition-transform duration-300
              ${rightOpen ? "translate-x-0" : "translate-x-full"}
              md:static md:translate-x-0 md:w-80
            `}
          >
            <Sidebar
              selectedDate={selectedDate}
              notes={notes}
              onNotesChange={setNotes}
              tasks={dayTasks}
              setTasks={setDayTasks}
              reload={loadSidebarTasks}
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
