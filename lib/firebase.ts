// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User, // Importa el tipo User
  sendEmailVerification, // Para enviar correos de verificación
  sendPasswordResetEmail // Para restablecer contraseñas
} from "firebase/auth";

let app: any = null;
export let db: any = null; // Exportamos db y auth para que puedan ser usados directamente si es necesario
export let auth: any = null;
export type { User };
export { sendEmailVerification, sendPasswordResetEmail };

// Promesa que se resuelve cuando Firebase App y Auth/Firestore están inicializados.
// NO espera a que un usuario inicie sesión.
let firebaseInitResolve: (() => void) | null = null;
export const firebaseInitialized = new Promise<void>( // Renombrado para mayor claridad
  (res) => (firebaseInitResolve = res)
);

// Variables para gestionar el estado del usuario actual y los suscriptores.
let _currentUser: User | null = null;
const authStateChangedCallbacks: ((user: User | null) => void)[] = [];

export function initFirebase(config: any) {
  if (app) return firebaseInitialized; // Si ya está inicializado, devuelve la promesa existente.

  app = initializeApp(config);
  db = getFirestore(app);
  auth = getAuth(app);

  // Escucha los cambios en el estado de autenticación
  onAuthStateChanged(auth, (user) => {
    _currentUser = user;
    console.log("Estado de autenticación cambiado. Usuario actual:", user ? user.uid : "Ninguno");
    if (user) {
        console.log("Email del usuario:", user.email);
        console.log("Email verificado:", user.emailVerified); // <-- AÑADIR ESTA LÍNEA
        if (!user.emailVerified) {
            console.warn("ADVERTENCIA: El email del usuario no está verificado. Las operaciones de Firestore pueden fallar.");
        }
    }
    authStateChangedCallbacks.forEach(callback => callback(user));
  });

  // Resuelve la promesa de inicialización tan pronto como los servicios están listos.
  if (firebaseInitResolve) firebaseInitResolve();

  return firebaseInitialized;
}

// Función para suscribirse a los cambios de estado de autenticación.
// Útil para componentes que necesitan reaccionar a logins/logouts.
export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  authStateChangedCallbacks.push(callback);
  // Llama al callback inmediatamente con el estado actual si ya está disponible.
  if (_currentUser !== undefined) {
    callback(_currentUser);
  }
  return () => { // Devuelve una función para desuscribirse.
    const index = authStateChangedCallbacks.indexOf(callback);
    if (index > -1) {
      authStateChangedCallbacks.splice(index, 1);
    }
  };
}

// *** Funciones de Autenticación de Email/Contraseña ***

export async function signUpWithEmail(email: string, password: string) {
  await firebaseInitialized; // Asegura que Firebase Auth esté inicializado.
  if (!auth) throw new Error("Firebase Auth no inicializado");
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // IMPORTANTE: Envía el correo de verificación inmediatamente después del registro.
    await sendEmailVerification(userCredential.user);
    console.log("Usuario registrado. Correo de verificación enviado a:", email);
    return userCredential.user;
  } catch (error: any) {
    console.error("Error al registrar usuario:", error.code, error.message);
    throw error; // Propaga el error para que la UI pueda manejarlo.
  }
}

export async function signInWithEmail(email: string, password: string) {
  await firebaseInitialized; // Asegura que Firebase Auth esté inicializado.
  if (!auth) throw new Error("Firebase Auth no inicializado");
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Usuario ha iniciado sesión:", userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error("Error al iniciar sesión:", error.code, error.message);
    throw error;
  }
}

export async function signOutUser() {
  await firebaseInitialized; // Asegura que Firebase Auth esté inicializado.
  if (!auth) throw new Error("Firebase Auth no inicializado");
  try {
    await signOut(auth);
    console.log("Usuario ha cerrado sesión.");
  } catch (error: any) {
    console.error("Error al cerrar sesión:", error.code, error.message);
    throw error;
  }
}

export async function resetPassword(email: string) {
  await firebaseInitialized;
  if (!auth) throw new Error("Firebase Auth no inicializado");
  try {
    await sendPasswordResetEmail(auth, email);
    console.log("Correo de restablecimiento de contraseña enviado a:", email);
  } catch (error: any) {
    console.error("Error al enviar correo de restablecimiento:", error.code, error.message);
    throw error;
  }
}

// *** Funciones de Notas (modificadas para usar _currentUser) ***

export function makeNoteId(uid: string, dateKey: string) {
  return `${uid}_${dateKey}`;
}

export function formatKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function saveNoteForDate(dateKey: string, text: string) {
  await firebaseInitialized; // Asegura que Firebase esté inicializado.
  if (!_currentUser) {
    throw new Error("Usuario no autenticado. No se puede guardar la nota.");
  }
  // Se requiere verificación de correo electrónico según las nuevas reglas de seguridad.
  if (!_currentUser.emailVerified) {
      throw new Error("Correo electrónico no verificado. Por favor, verifica tu correo antes de guardar.");
  }

  const noteId = makeNoteId(_currentUser.uid, dateKey);
  const ref = doc(db, "notes", noteId);

  if (text.trim() === "") {
    // Si el texto está vacío, borramos la nota
    console.log("Texto vacío, borrando nota con ID:", noteId);
    await deleteDoc(ref);
    return null;
  }

  const payload = {
    text,
    updatedAt: Date.now(),
    userId: _currentUser.uid, // Asegura que el userId se guarde correctamente.
  };

  console.log("Guardando nota con ID:", noteId, "Payload:", payload);
  await setDoc(ref, payload);
  console.log("Nota guardada exitosamente.");
  return payload;
}

export async function loadNoteForDate(dateKey: string) {
  await firebaseInitialized; // Asegura que Firebase esté inicializado.
  if (!_currentUser) {
    throw new Error("Usuario no autenticado. No se puede cargar la nota.");
  }
  // Se requiere verificación de correo electrónico según las nuevas reglas de seguridad.
  if (!_currentUser.emailVerified) {
      throw new Error("Correo electrónico no verificado. Por favor, verifica tu correo antes de cargar.");
  }

  const noteId = makeNoteId(_currentUser.uid, dateKey);
  console.log("Cargando nota para ID:", noteId, "con UID:", _currentUser.uid);
  const ref = doc(db, "notes", noteId);

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.log("Nota con ID:", noteId, "no encontrada.");
    return null;
  }
  console.log("Nota con ID:", noteId, "encontrada. Datos:", snap.data());
  return snap.data();
}