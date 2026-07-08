import { notFound } from "next/navigation";
import { getDemo } from "@/lib/demos";
import DemoChat from "./DemoChat";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demo = getDemo(id);
  if (!demo) return { title: "Demo — Lead Lab" };
  return {
    title: `${demo.agente} · ${demo.nombre}`,
    description: `Conversa con ${demo.agente}, la asistente con IA de ${demo.nombre}.`,
  };
}

export default async function DemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demo = getDemo(id);
  if (!demo) notFound();
  return (
    <DemoChat
      id={demo.id}
      nombre={demo.nombre}
      agente={demo.agente}
      rubro={demo.rubro}
      color={demo.color}
    />
  );
}
