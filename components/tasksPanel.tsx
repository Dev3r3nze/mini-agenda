// components/TasksPanel.tsx
"use client";

import { use, useEffect, useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
  listUnassignedTasks,
  createTask,
  updateTask,
  deleteCompletedTasks,
} from "@/lib/firebase"; // ⬅️ asumimos estas funciones ya existentes

import { useDroppable } from "@dnd-kit/core";

// ---------- Tipos ----------
export interface Task {
  id: string;
  text: string;
  order: number;
  completed: boolean;
}

// ---------- Item sortable ----------
export function SortableTask({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2  rounded hover:bg-accent"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground"
      >
        ⋮⋮
      </span>

      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id)}
      />

      <span className={task.completed ? "line-through opacity-60" : ""}>
        {task.text}
      </span>
    </div>
  );
}

// ---------- Panel principal ----------
export default function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const { setNodeRef } = useDroppable({
    id: "unassigned-list",
  });

  // Crear tarea
  async function handleCreateTask() {
    if (!newTitle.trim()) return;

    const order = tasks.length;
    const result = await createTask(newTitle.trim(), order);
    const task: Task = {
      id: result.id,
      text: newTitle.trim(),
      order: order,
      completed: false,
    };
    console.log("Tarea creada:", task);

    setTasks((prev) => [...prev, task]);
    setNewTitle("");
  }

  function toggleCompleted(id: string) {
    setTasks((prev) => {
      return prev.map((t) => {
        if (t.id !== id) return t;

        const newCompleted = !t.completed;

        // 🔥 Guardar AQUÍ, con el valor correcto
        updateTask(id, { completed: newCompleted });

        return { ...t, completed: newCompleted };
      });
    });
  }

  return (
    <aside className="w-72 border-b border-border bg-card p-4 flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Tareas</h2>

      {/* Crear tarea */}
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1"
          placeholder="Nueva tarea…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
        />
        <button
          onClick={handleCreateTask}
          className="px-3 py-1 rounded bg-primary text-primary-foreground"
        >
          +
        </button>
      </div>

      {/* Lista de tareas SIN FECHA (droppable) */}
      <div
        ref={setNodeRef}
        id="unassigned-list"
        className="flex-1 overflow-hidden hover:border-accent select-none border border-dashed border-border rounded p-2"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <SortableTask
                key={task.id}
                task={task}
                onToggle={toggleCompleted}
              />
            ))}
          </div>
        </SortableContext>

        {tasks.length === 0 && (
          <p className="text-sm opacity-60 italic mt-2">No hay tareas</p>
        )}
      </div>

      {/* Eliminar completadas */}
      {tasks.some((t) => t.completed) && (
        <button
          onClick={async () => {
            await deleteCompletedTasks();
            setTasks((prev) => prev.filter((t) => !t.completed));
          }}
          className="px-3 py-1 rounded bg-primary text-primary-foreground"
        >
          Eliminar tareas completadas
        </button>
      )}
    </aside>
  );
}
