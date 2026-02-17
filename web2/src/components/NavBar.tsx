import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type Section = "cocina" | "caja" | "platillos" | "historial" | "parallevar";

interface NavBarProps {
  section: Section;
  setSection: (s: Section) => void;
}

export default function NavBar({ section, setSection }: NavBarProps) {
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) {
        setOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const linkStyle = (active: boolean): React.CSSProperties => ({
    background: "transparent",
    border: "none",
    padding: "10px 10px",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    color: "#1F2A44",
    letterSpacing: 0.2,
    borderBottom: active ? "2px solid #1F2A44" : "2px solid transparent",
    transition: "all 160ms ease",
    textAlign: "left",
  });

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        background: "#FFFFFF",
        borderBottom: "1px solid rgba(0,0,0,0.12)",
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* LEFT */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* HAMBURGUESA */}
          <button
            onClick={() => setOpen(!open)}
            className="hamburger"
            style={{
              fontSize: 26,
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "none",
            }}
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <div
            style={{
              fontFamily: 'Georgia, "Times New Roman", Times, serif',
              fontSize: 26,
              fontWeight: 500,
              color: "#46087b",
              lineHeight: 1,
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            Restaurante Villa Duarte
          </div>
        </div>

        {/* LINKS DESKTOP */}
        <div className="nav-links" style={{ display: "flex", gap: 14, marginRight: 12 }}>
          <button onClick={() => setSection("cocina")} style={linkStyle(section === "cocina")}>
            Cocina
          </button>

          <button onClick={() => setSection("caja")} style={linkStyle(section === "caja")}>
            Caja
          </button>

          <button onClick={() => setSection("platillos")} style={linkStyle(section === "platillos")}>
            Platillos
          </button>

          <button onClick={() => setSection("historial")} style={linkStyle(section === "historial")}>
            Historial
          </button>

          {/* ✅ NUEVO */}
          <button onClick={() => setSection("parallevar")} style={linkStyle(section === "parallevar")}>
            Para llevar (WhatsApp)
          </button>

          <button
            onClick={handleLogout}
            style={{
              ...linkStyle(false),
              color: "#B42318",
              marginLeft: 8,
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* MENU MÓVIL */}
      {open && (
        <div
          className="mobile-menu"
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "12px 16px",
            gap: 6,
            borderTop: "1px solid rgba(0,0,0,0.1)",
            background: "#FFFFFF",
          }}
        >
          <button
            onClick={() => {
              setSection("cocina");
              setOpen(false);
            }}
            style={linkStyle(section === "cocina")}
          >
            Cocina
          </button>

          <button
            onClick={() => {
              setSection("caja");
              setOpen(false);
            }}
            style={linkStyle(section === "caja")}
          >
            Caja
          </button>

          <button
            onClick={() => {
              setSection("platillos");
              setOpen(false);
            }}
            style={linkStyle(section === "platillos")}
          >
            Platillos
          </button>

          <button
            onClick={() => {
              setSection("historial");
              setOpen(false);
            }}
            style={linkStyle(section === "historial")}
          >
            Historial
          </button>

          {/* ✅ NUEVO */}
          <button
            onClick={() => {
              setSection("parallevar");
              setOpen(false);
            }}
            style={linkStyle(section === "parallevar")}
          >
            Para llevar (WhatsApp)
          </button>

          <button onClick={handleLogout} style={{ ...linkStyle(false), color: "#B42318" }}>
            Cerrar sesión
          </button>
        </div>
      )}

      {/* CSS RESPONSIVE */}
      <style>{`
        @media (max-width: 820px) {
          .nav-links {
            display: none !important;
          }
          .hamburger {
            display: block !important;
          }
        }
      `}</style>
    </nav>
  );
}
