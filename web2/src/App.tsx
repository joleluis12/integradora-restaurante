import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

//  Screens
import Login from "./screens/Login";
import Cocina from "./screens/Cocina";
import Caja from "./screens/Caja";
import Platillos from "./screens/Platillos";
import Historial from "./screens/Historial";
import Parallevar from "./screens/parallevar"; // ✅ NUEVO (archivo en minúsculas)

//  Navbar
import NavBar from "./components/NavBar";

type Section = "cocina" | "caja" | "platillos" | "historial" | "parallevar"; // ✅ NUEVO

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [section, setSection] = useState<Section>("cocina");
  const [loading, setLoading] = useState(true);

  // ✅ LOG para ver si sí cambia cuando le picas al nav
  useEffect(() => {
    console.log("🧭 [App] section:", section);
  }, [section]);

  // ===============================
  //  Verificar sesión activa
  // ===============================
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setLoading(false);
    };

    loadSession();

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ===============================
  //  Loading
  // ===============================
  if (loading) {
    return (
      <p
        style={{
          textAlign: "center",
          marginTop: 100,
          fontSize: 20,
          color: "#555",
        }}
      >
        Cargando...
      </p>
    );
  }

  // ===============================
  //  Login
  // ===============================
  if (!user) return <Login onLogin={setUser} />;

  // ===============================
  //  App principal
  // ===============================
  return (
    <div
      style={{
        backgroundColor: "#f5f6fa",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // IMPORTANTE: no scroll aquí
      }}
    >
      <NavBar section={section} setSection={setSection} />

      <main
        style={{
          flex: 1,
          width: "100%",
          margin: 0,
          padding: 0,
          overflowY: "auto", //  ÚNICO scroll
          animation: "fadeIn 0.25s ease",
        }}
      >
        {section === "cocina" && <Cocina />}
        {section === "caja" && <Caja />}
        {section === "platillos" && <Platillos />}
        {section === "historial" && <Historial />}

        {/* ✅ NUEVO */}
        {section === "parallevar" && <Parallevar />}
      </main>

      {/* Animación */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
