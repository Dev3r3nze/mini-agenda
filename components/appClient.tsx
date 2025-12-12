// components/AppClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import { initFirebase, subscribeToAuthChanges, type User } from "@/lib/firebase";
import Sidebar from "./sidebar";
import Calendar from "./calendar";
import LoginSignup from "./loginSingup";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export default function AppClient() {
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    // inicializa firebase en cliente
    initFirebase(firebaseConfig);

    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (currentUser === undefined) {
    return <div className="loading-screen">Cargando autenticación...</div>;
  }

  if (!currentUser || !currentUser.emailVerified) {
    return <LoginSignup currentUser={currentUser} />;
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
  );
}
