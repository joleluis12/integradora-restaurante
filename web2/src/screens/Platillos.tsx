import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { COLORS } from "../styles/theme";

interface Platillo {
  id?: number;
  nombre: string;
  descripcion: string;
  precio: number;
  disponible: boolean;
  imagen_url?: string | null;
}

export default function Platillos() {
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [nuevo, setNuevo] = useState<Platillo>({
    nombre: "",
    descripcion: "",
    precio: 0,
    disponible: true,
    imagen_url: "",
  });
  const [editando, setEditando] = useState<Platillo | null>(null);

  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);

  const fetchPlatillos = async () => {
    const { data, error } = await supabase
      .from("platillos")
      .select("*")
      .order("id", { ascending: true });

    if (error) console.error("❌ Error al cargar platillos:", error);
    else setPlatillos(data || []);
  };

  useEffect(() => {
    fetchPlatillos();
  }, []);

  const handleGuardar = async () => {
    if (!nuevo.nombre || nuevo.precio <= 0) {
      alert("⚠️ Ingresa al menos un nombre y precio válido");
      return;
    }

    const dataToSave = {
      nombre: nuevo.nombre,
      descripcion: nuevo.descripcion,
      precio: nuevo.precio,
      disponible: nuevo.disponible,
      imagen_url: nuevo.imagen_url || null,
    };

    const { error } = editando
      ? await supabase.from("platillos").update(dataToSave).eq("id", editando.id)
      : await supabase.from("platillos").insert([dataToSave]);

    if (error) {
      console.error("❌ Error guardando platillo:", error);
      alert("No se pudo guardar el platillo");
    } else {
      alert(editando ? "✅ Platillo actualizado" : "✅ Platillo agregado");
      setNuevo({
        nombre: "",
        descripcion: "",
        precio: 0,
        disponible: true,
        imagen_url: "",
      });
      setEditando(null);
      fetchPlatillos();
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este platillo?")) return;

    const { error } = await supabase.from("platillos").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("❌ No se pudo eliminar");
    } else {
      alert("🗑️ Platillo eliminado");
      if (seleccionadoId === id) setSeleccionadoId(null);
      fetchPlatillos();
    }
  };

  const handleEditar = (p: Platillo) => {
    setNuevo({ ...p });
    setEditando(p);
    if (p.id) setSeleccionadoId(p.id);
  };

  const seleccionado = useMemo(() => {
    if (seleccionadoId == null) return null;
    return platillos.find((x) => x.id === seleccionadoId) || null;
  }, [platillos, seleccionadoId]);

  const badgeStyle = (disponible: boolean): React.CSSProperties => ({
    ...S.badge,
    borderColor: disponible ? "rgba(34,197,94,.40)" : "rgba(239,68,68,.40)",
    background: disponible ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)",
    color: disponible ? "#22C55E" : "#EF4444",
  });

  return (
    <div style={S.page}>
      <style>{css}</style>

      <div style={S.wrap}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={S.title}>Productos</h2>
            <span style={S.subtitle}>Variantes de producto</span>
          </div>

          <button
            className="btnSoft"
            onClick={() => {
              setEditando(null);
              setNuevo({
                nombre: "",
                descripcion: "",
                precio: 0,
                disponible: true,
                imagen_url: "",
              });
            }}
            style={S.btnNuevo}
          >
            Nuevo
          </button>
        </div>

        {/* Form Bar */}
          <div style={S.formBar} className="form-bar">
          <input
            type="text"
            placeholder="Nombre"
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            style={S.input}
          />
          <input
            type="text"
            placeholder="Descripción"
            value={nuevo.descripcion}
            onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
            style={S.input}
          />
          <input
            type="number"
            placeholder="Precio"
            value={nuevo.precio || ""}
            onChange={(e) => {
              const val = e.target.value;
              setNuevo({ ...nuevo, precio: val === "" ? 0 : parseFloat(val) });
            }}
            style={S.input}
          />
          <input
            type="text"
            placeholder="URL de imagen (opcional)"
            value={nuevo.imagen_url || ""}
            onChange={(e) => setNuevo({ ...nuevo, imagen_url: e.target.value })}
            style={S.input}
          />

          <label style={S.label}>
            <input
              type="checkbox"
              checked={nuevo.disponible}
              onChange={(e) => setNuevo({ ...nuevo, disponible: e.target.checked })}
            />
            Disponible
          </label>

          <button className="btnPrimary" onClick={handleGuardar} style={S.btnGuardar}>
            {editando ? "Guardar" : "Crear"}
          </button>
        </div>

        {/* Layout */}
        <div style={S.layout} className="platillos-grid">
          {/* Table */}
          <div style={S.card}>
              <div style={S.tableHeaderRow} className="tableHeaderRow">
              <div style={{ ...S.th, flex: 0.6 }}>ID</div>
              <div style={{ ...S.th, flex: 2 }}>Nombre</div>
              <div style={{ ...S.th, flex: 3 }}>Descripción</div>
              <div style={{ ...S.th, flex: 1.2, textAlign: "right" }}>Precio</div>
              <div style={{ ...S.th, flex: 1.2 }}>Estado</div>
            </div>

            <div style={S.tableBody}>
              {platillos.map((p) => {
                const active = p.id === seleccionadoId;

                return (
                  <div
                    key={p.id}
                    className={`row ${active ? "rowActive" : ""}`}
                    style={{ ...S.tr, ...(active ? S.trActive : {}) }}
                    onClick={() => p.id && setSeleccionadoId(p.id)}
                  >
                    <div style={{ ...S.td, flex: 0.6, color: "rgba(226,232,240,0.65)" }}>
                      {p.id}
                    </div>

                    <div style={{ ...S.td, flex: 2, fontWeight: 900, color: "#EAF0FF" }}>
                      {p.nombre}
                    </div>

                    <div style={{ ...S.td, flex: 3, color: "rgba(226,232,240,0.70)" }}>
                      {p.descripcion || "Sin descripción"}
                    </div>

                    <div style={{ ...S.td, flex: 1.2, textAlign: "right", color: "#EAF0FF" }}>
                      ${p.precio.toFixed(2)}
                    </div>

                    <div style={{ ...S.td, flex: 1.2 }}>{/* badge */}
                      <span style={badgeStyle(p.disponible)}>
                        {p.disponible ? "Disponible" : "No disponible"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {platillos.length === 0 && (
                <div style={S.emptyTable}>
                  <div style={S.emptyIcon}>⬚</div>
                  <div style={S.emptyText}>No hay platillos registrados</div>
                </div>
              )}
            </div>
          </div>

          {/* Side Panel */}
          <div style={S.card}>
            {!seleccionado ? (
              <div style={S.sideEmpty}>
                <div style={S.sideEmptyTitle}>Selecciona un platillo</div>
                <div style={S.sideEmptyText}>
                  Haz click en una fila para ver el detalle aquí.
                </div>
              </div>
            ) : (
              <div style={S.sideCard}>
                <div style={S.sideTop}>
                  <div style={{ minWidth: 0 }}>
                    <div style={S.sideName}>{seleccionado.nombre}</div>
                    <div style={S.sideMeta}>
                      ID #{seleccionado.id} •{" "}
                      <span style={badgeStyle(seleccionado.disponible)}>
                        {seleccionado.disponible ? "Disponible" : "No disponible"}
                      </span>
                    </div>
                  </div>

                  {seleccionado.imagen_url ? (
                    <img
                      src={seleccionado.imagen_url}
                      alt={seleccionado.nombre}
                      style={S.sideImg}
                    />
                  ) : (
                    <div style={S.sideImgPlaceholder}>Sin imagen</div>
                  )}
                </div>

                <div style={S.sideSection}>
                  <div style={S.sideLabel}>Descripción</div>
                  <div style={S.sideValue}>
                    {seleccionado.descripcion || "Sin descripción"}
                  </div>
                </div>

                <div style={S.sideSection}>
                  <div style={S.sideLabel}>Precio</div>
                  <div style={S.sideValueStrong}>${seleccionado.precio.toFixed(2)}</div>
                </div>

                <div style={S.sideActions}>
                  <button
                    className="btnSoft"
                    onClick={() => handleEditar(seleccionado)}
                    style={S.btnEditar}
                  >
                    Editar
                  </button>
                  <button
                    className="btnDanger"
                    onClick={() => handleEliminar(seleccionado.id!)}
                    style={S.btnEliminar}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== CSS (animaciones suaves + responsive) ===== */
const css = `
/* ===============================
   EFECTOS
================================ */
.row:hover { background: rgba(255,255,255,0.03); }
.rowActive { background: rgba(124,58,237,0.10); }

.btnPrimary:hover { transform: translateY(-1px); opacity: .98; }
.btnPrimary:active { transform: translateY(0px); opacity: .96; }
.btnSoft:hover { transform: translateY(-1px); }
.btnSoft:active { transform: translateY(0px); }
.btnDanger:hover { transform: translateY(-1px); opacity: .98; }
.btnDanger:active { transform: translateY(0px); opacity: .96; }

/* ===============================
   TABLET
================================ */
@media (max-width: 1050px){
  .platillos-grid {
    grid-template-columns: 1fr !important;
  }
}

/* ===============================
   MÓVIL – PLATILLOS
================================ */
@media (max-width: 640px) {

  /* layout principal */
  .platillos-grid {
    grid-template-columns: 1fr !important;
    gap: 16px;
  }

  /* oculta encabezado tabla */
  .tableHeaderRow {
    display: none !important;
  }

  /* filas como cards */
  .row {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 8px;
    padding: 14px !important;
  }

  /* columnas ocupan todo */
  .row > div {
    width: 100% !important;
    flex: none !important;
    text-align: left !important;
    white-space: normal !important;
  }

  /* precio destacado */
  .row > div:nth-child(4) {
    font-size: 16px;
    font-weight: 900;
    color: #A855F7;
  }

  /* badge abajo */
  .row > div:last-child {
    margin-top: 6px;
  }
}
  /* ===============================
   FORMULARIO RESPONSIVE (MÓVIL)
================================ */
@media (max-width: 640px) {
  .form-bar {
    grid-template-columns: 1fr !important;
    gap: 12px;
  }

  .form-bar input {
    width: 100%;
  }

  .form-bar label {
    justify-self: flex-start;
  }

  .form-bar .btnPrimary {
    width: 100%;
    justify-self: stretch;
  }
}
@media (max-width: 640px) {
  .form-bar label {
    padding: 6px 0;
  }
}
  /* Ocultar spinner nativo */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield; /* Firefox */
}


`;


/* ===== Styles (sin letras brillosas) ===== */
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 600px at 50% -120px, rgba(124,58,237,0.16), transparent 60%), linear-gradient(180deg, #0B1220 0%, #0A1020 30%, #070C16 100%)",
    color: "#E5E7EB",
  },
  wrap: {
    maxWidth: "100%",
    margin: "0 auto",
    padding: "24px 16px", 
  },

  header: {
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    background: "rgba(13, 21, 38, 0.72)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 1000 as const,
    color: "#EAF0FF",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: 900,
    color: "rgba(226,232,240,0.70)",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(10,16,32,0.35)",
  },
  btnNuevo: {
    background: "rgba(124,58,237,.14)",
    color: "#E9D5FF",
    border: "1px solid rgba(124,58,237,.28)",
    borderRadius: 12,
    padding: "9px 12px",
    fontWeight: 950,
    cursor: "pointer",
    transition: "transform 120ms ease",
  },

  formBar: {
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    background: "rgba(13, 21, 38, 0.72)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
    display: "grid",
    gridTemplateColumns: "1.1fr 1.6fr .7fr 1.6fr auto auto",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: 17,
    backgroundColor: "rgba(10,16,32,0.55)",
    color: "#EAF0FF",
    outline: "none",
  },

  label: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "rgba(226,232,240,0.85)",
    fontWeight: 900,
    fontSize: 18,
    whiteSpace: "nowrap",
  },

  btnGuardar: {
    justifySelf: "end",
    backgroundColor: COLORS.primary || "#7C3AED",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 1000 as const,
    cursor: "pointer",
    transition: "transform 120ms ease, opacity 120ms ease",
    boxShadow: "0 18px 30px rgba(124,58,237,0.20)",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "1.6fr 1fr",
    gap: 12,
    width: "100%",
    alignItems: "start",
  },

  card: {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(13, 21, 38, 0.72)",
  backdropFilter: "blur(10px)",
  boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
  minHeight: 520,
},

  tableHeaderRow: {
    display: "flex",
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(10,16,32,0.35)",
  },
  th: {
    fontSize: 13,
    fontWeight: 1000 as const,
    color: "rgba(226,232,240,0.68)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  tableBody: { display: "flex", flexDirection: "column" },

  tr: {
    display: "flex",
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    cursor: "pointer",
    transition: "background 120ms ease",
  },
  trActive: {
    outline: "1px solid rgba(124,58,237,0.24)",
  },

  td: {
    fontSize: 17,
    paddingRight: 8,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 15,
    fontWeight: 1000 as const,
    border: "1px solid rgba(255,255,255,0.10)",
    whiteSpace: "nowrap",
  },

  emptyTable: {
    padding: 18,
    display: "grid",
    placeItems: "center",
    gap: 10,
    minHeight: 240,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(226,232,240,0.70)",
    fontWeight: 900,
  },
  emptyText: { fontWeight: 950, color: "rgba(226,232,240,0.75)" },

  // side
 sideEmpty: {
  padding: 24,
  minHeight: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
},

 sideEmptyTitle: {
  fontWeight: 1000 as const,
  fontSize: 23,        
  color: "#EAF0FF",
},

sideEmptyText: {
  marginTop: 10,
  fontSize: 19,        
  color: "rgba(226,232,240,0.75)",
  lineHeight: 1.5,
  maxWidth: 320,
},

  sideCard: { padding: 18 },
  sideTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    paddingBottom: 12,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  sideName: { fontSize: 20, fontWeight: 1000 as const, color: "#EAF0FF" },
  sideMeta: {
    marginTop: 8,
    color: "rgba(226,232,240,0.70)",
    fontSize: 13,
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  sideImg: {
    width: 74,
    height: 74,
    borderRadius: 14,
    objectFit: "cover",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  sideImgPlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 14,
    border: "1px dashed rgba(255,255,255,0.18)",
    color: "rgba(226,232,240,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    fontWeight: 1000 as const,
    background: "rgba(10,16,32,0.35)",
  },

  sideSection: { paddingTop: 12 },
  sideLabel: {
    fontSize: 15,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "rgba(226,232,240,0.62)",
    fontWeight: 1000 as const,
  },
  sideValue: { marginTop: 6, color: "rgba(226,232,240,0.86)", fontSize: 14, lineHeight: 1.45 },
  sideValueStrong: { marginTop: 6, color: "#EAF0FF", fontSize: 18, fontWeight: 1000 as const },

  sideActions: { display: "flex", gap: 10, marginTop: 16 },
  btnEditar: {
    flex: 1,
    background: "rgba(59,130,246,0.16)",
    color: "#BFDBFE",
    border: "1px solid rgba(59,130,246,0.28)",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 1000 as const,
    transition: "transform 120ms ease",
  },
  btnEliminar: {
    flex: 1,
    background: "rgba(239,68,68,0.16)",
    color: "#FECACA",
    border: "1px solid rgba(239,68,68,0.28)",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 1000 as const,
    transition: "transform 120ms ease, opacity 120ms ease",
  },
};
