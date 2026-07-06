import { redirect } from "next/navigation";

// "Cerebro" dejó de ser una sección propia: ahora vive como tab dentro de
// Agentes IA (admin: "Cerebros"; cliente: "Ficha del agente"). Mantenemos la
// ruta como alias para deep-links viejos.
export default function CerebroRedirect() {
  redirect("/consola/agentes");
}
