// app/page.tsx
export const dynamic = "force-dynamic";

import React from "react";
import AppClient from "@/components/appClient";

export default function HomePage() {
  // Server Component: simple contenedor que carga el Client Component
  return <AppClient />;
}
