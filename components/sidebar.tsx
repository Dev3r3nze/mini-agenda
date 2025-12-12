// components/Sidebar.tsx
"use client"
import React, { useEffect, useState, useRef } from "react"
import { formatKey, loadNoteForDate, saveNoteForDate } from "../lib/firebase"
import { firebaseInitialized } from "../lib/firebase"

interface SidebarProps {
  selectedDate: Date
  notes: string
  onNotesChange: (notes: string) => void
}

export default function Sidebar({ selectedDate, notes, onNotesChange }: SidebarProps) {
  const [localNotes, setLocalNotes] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  const [currentTime, setCurrentTime] = useState(new Date())


  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // actualizar la hora cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000 * 60) // cada minuto
    return () => clearInterval(interval)
  }, [])

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleString("default", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleString("default", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Europe/Madrid", // GMT+1 / CET
    })
  }

  // Cuando cambia la fecha seleccionada, cargar nota desde Firebase
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Espera a que Firebase esté inicializado y autenticado
        await firebaseInitialized; 

        const key = formatKey(selectedDate)
        const res = await loadNoteForDate(key) // ahora db y uid existen
        if (!cancelled && mounted.current) {
          const text = res?.text ?? ""
          setLocalNotes(text)
          onNotesChange(text) // opcional si quieres sincronizar parent
        }
      } catch (err: any) {
        console.error("Error loading note:", err)
        if (!cancelled && mounted.current) setError("Error cargando nota")
      } finally {
        if (!cancelled && mounted.current) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [selectedDate, onNotesChange])

  // controlar cambios locales
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalNotes(e.target.value)
  }

  // guardar en blur
  const handleBlur = async () => {
    // evitar guardar si no hay cambios
    try {
      setSaving(true)
      setError(null)

      // Espera a que Firebase esté inicializado y autenticado
        await firebaseInitialized; 

      const key = formatKey(selectedDate)
      await saveNoteForDate(key, localNotes)

      
      onNotesChange(localNotes)
    } catch (err: any) {
      console.error("Error saving note:", err)
      setError("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="mb-6">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Selected Date</h2>
        <div className="bg-muted rounded-lg p-4">
          <p className="text-lg font-medium text-foreground">
            {selectedDate.toLocaleString("default", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
            <div className="text-sm text-muted-foreground mt-1">{formatTime(currentTime)}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2">Notes</h2>

        <textarea
          value={localNotes}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Add your notes here..."
          className="flex-1 bg-muted border border-border rounded-lg p-3 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
        />

        {loading && <div className="text-xs text-muted-foreground mt-2">Cargando...</div>}
        {saving && <div className="text-xs text-muted-foreground mt-2">Guardando...</div>}
        {error && <div className="text-xs text-danger mt-2">{error}</div>}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground">💡 Tip: Haz click en cualquier fecha para seleccionar y editar la nota.</p>
      </div>
    </div>
  )
}
