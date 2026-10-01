/**
 * supabaseClient.js — Cliente único de Supabase para toda la app.
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Mensaje claro en consola si faltan credenciales
  console.error(
    "[Supabase] Faltan credenciales. Copia .env.example a .env.local y " +
      "rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(url, anonKey, {
  realtime: { params: { eventsPerSecond: 5 } },
});

export const credencialesOk = Boolean(url && anonKey);
