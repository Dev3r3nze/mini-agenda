// components/LoginSignup.tsx
"use client"
import React, { useState } from "react";
import { signUpWithEmail, signInWithEmail, signOutUser, sendEmailVerification, User } from "../lib/firebase";

interface LoginSignupProps {
  currentUser: User | null; // Pasa el usuario actual para mostrar mensajes o botones de cerrar sesión
}

export default function LoginSignup({ currentUser }: LoginSignupProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);
    setMessage(null);
    try {
      await signUpWithEmail(email, password);
      setMessage("Registro exitoso. Por favor, verifica tu correo electrónico para iniciar sesión.");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignIn = async () => {
    setError(null);
    setMessage(null);
    try {
      const user = await signInWithEmail(email, password);
      if (user && !user.emailVerified) {
        setMessage("¡Bienvenido! Tu correo aún no está verificado. Por favor, revisa tu bandeja de entrada.");
        // Opcional: Reenviar verificación si el usuario lo solicita
      } else {
        setMessage("Inicio de sesión exitoso.");
      }
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    setMessage(null);
    try {
      await signOutUser();
      setMessage("Sesión cerrada correctamente.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResendVerification = async () => {
    setError(null);
    setMessage(null);
    if (currentUser) {
      try {
        await sendEmailVerification(currentUser);
        setMessage("Correo de verificación reenviado. Revisa tu bandeja de entrada.");
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      setError("No hay usuario autenticado para reenviar el correo.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="p-8 rounded-lg shadow-md bg-card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-foreground">Autenticación</h1>

        {currentUser && !currentUser.emailVerified && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
            <p className="font-bold">Verifica tu correo electrónico</p>
            <p>Tu cuenta no está verificada. Revisa tu bandeja de entrada para el enlace de verificación. {" "}
              <button onClick={handleResendVerification} className="text-blue-500 hover:underline">
                Reenviar correo
              </button>
            </p>
          </div>
        )}

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        {message && <p className="text-green-500 text-center mb-4">{message}</p>}

        {!currentUser ? (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mb-4 border border-border rounded-md bg-input text-foreground"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mb-6 border border-border rounded-md bg-input text-foreground"
            />
            <button
              onClick={handleSignIn}
              className="w-full bg-primary text-primary-foreground p-3 rounded-md mb-2 hover:bg-primary/90 transition-colors"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={handleSignUp}
              className="w-full bg-secondary text-secondary-foreground p-3 rounded-md hover:bg-secondary/90 transition-colors"
            >
              Registrarse
            </button>
            {/* Opcional: Enlace para restablecer contraseña */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              ¿Olvidaste tu contraseña? <a href="#" className="text-blue-500 hover:underline">Restablecer</a>
            </p>
          </>
        ) : (
          <div className="text-center">
            <p className="text-lg text-foreground mb-4">Has iniciado sesión como: {currentUser.email}</p>
            <button
              onClick={handleSignOut}
              className="w-full bg-destructive text-destructive-foreground p-3 rounded-md hover:bg-destructive/90 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
}