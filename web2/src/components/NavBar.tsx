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
      if (window.innerWidth > 820) setOpen(false);
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
      {/* ✅ UNA SOLA BARRA (desktop y móvil) */}
      <div className="navBarRow">
        {/* LEFT: hamburguesa + brand */}
        <div className="navLeft">
          <button
            onClick={() => setOpen((v) => !v)}
            className="hamburger"
            aria-label="Abrir menú"
            type="button"
          >
            ☰
          </button>

          <div className="brand">Restaurante Villa Duarte</div>
        </div>

        {/* RIGHT: links desktop */}
        <div className="nav-links">
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
          <button onClick={() => setSection("parallevar")} style={linkStyle(section === "parallevar")}>
            Para llevar
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

      {/* ✅ CSS RESPONSIVE */}
      <style>{`
        .navBarRow {
          width: 100%;
          padding: 12px 16px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .navLeft {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .brand {
          font-family: Georgia, "Times New Roman", Times, serif;
          font-size: 26px;
          font-weight: 500;
          color: #46087b;
          line-height: 1.1; /* ✅ leve mejora desktop */
          white-space: nowrap;
          user-select: none;
        }

        .hamburger {
          font-size: 26px;
          width: 50px;
          height: 64px;
          display: none;
          place-items: center;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 10px;
        }

        @media (max-width: 820px) {
          .nav-links { display: none !important; }
          .hamburger { display: grid !important; }

          .navBarRow {
            display: grid !important;
            grid-template-columns: 40px 1fr 40px; /* ✅ igual al botón */
            align-items: center;
            padding: 1px 12px; /* ✅ más compacto */
          }

          /* ✅ Esto es lo que lo alinea al mismo nivel:
             hacemos el título un "flex-center" con altura 40px */
          .brand {
            grid-column: 2;
            justify-self: center;

            display: flex;
            align-items: center;
            justify-content: center;

            height: 40px;      /* ✅ igual al botón */
            line-height: 44px; /* ✅ baseline perfecto */
            font-size: 20px;

            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .navLeft { display: contents; }

          .hamburger {
            grid-column: 1;
            justify-self: start;
          }
        }
      `}</style>
    </nav>
  );
}
