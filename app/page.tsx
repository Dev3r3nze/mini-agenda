export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { initFirebase, subscribeToAuthChanges, User } from "../lib/firebase";
import Sidebar from "../components/sidebar"; // Tu componente Sidebar
import LoginSignup from "../components/loginSingup"; // Nuevo componente que crearemos
import Calendar from "../components/calendar"; // Tu componente Calendar

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
}


export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined); // undefined = cargando, null = no logueado, User = logueado
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>("");

  

  useEffect(() => {
    initFirebase(firebaseConfig); // Inicializa Firebase
    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe(); // Limpia el suscriptor al desmontar
  }, []);

  if (currentUser === undefined) {
    // Estado de carga inicial mientras se verifica la sesión
    return <div className="loading-screen">Cargando autenticación...</div>;
  }

  if (!currentUser || !currentUser.emailVerified) {
    // Si no hay usuario o el email no está verificado, muestra la pantalla de Login/Registro
    return <LoginSignup currentUser={currentUser} />; // Pasa el usuario actual para mensajes si es necesario
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-6 md:p-8 overflow-auto">
          <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
        </div>
        <aside className="w-full md:w-80 border-l border-border bg-card">
          <Sidebar selectedDate={selectedDate} notes={notes} onNotesChange={setNotes} />
        </aside>
      </main>
    </div>
  )
}
