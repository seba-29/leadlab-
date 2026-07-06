import { redirect } from "next/navigation";

// "Conversión" ahora vive como tab del Dashboard (admin). Mantenemos la ruta
// como alias para deep-links viejos.
export default function ConversionRedirect() {
  redirect("/consola");
}
