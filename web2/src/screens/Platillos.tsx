import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "../supabaseClient";
import { COLORS } from "../styles/theme";

interface Platillo {
  id?: number;
  nombre: string;
  descripcion: string;
  precio: number;
  activo: boolean; // ✅ ESTA ES LA COLUMNA REAL EN SUPABASE
  imagen_url?: string | null;
}

const BUCKET_NAME = "platillos-images";

export default function Platillos() {
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [nuevo, setNuevo] = useState<Platillo>({
    nombre: "",
    descripcion: "",
    precio: 0,
    activo: true,
    imagen_url: "",
  });
  const [editando, setEditando] = useState<Platillo | null>(null);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);

  // ✅ Anti-duplicado: bloquea múltiples clicks
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const fetchPlatillos = async () => {
    const { data, error } = await supabase
      .from("platillos")
      .select("id,nombre,descripcion,precio,activo,imagen_url")
      .order("id", { ascending: true });

    if (error) console.error("❌ Error al cargar platillos:", error);
    else setPlatillos((data as Platillo[]) || []);
  };

  useEffect(() => {
    fetchPlatillos();
  }, []);

  const subirImagenASupabase = async (file: File) => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `platillos/${fileName}`;

    console.log("📎 imagenFile:", file);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      console.error("❌ Upload error:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    console.log("✅ publicUrl:", data.publicUrl);
    return data.publicUrl;
  };

  const handleGuardar = async () => {
    // ✅ Anti-duplicado: si ya está guardando, no hace nada
    if (savingRef.current) return;

    if (!nuevo.nombre || nuevo.precio <= 0) {
      alert("Ingresa al menos un nombre y precio válido");
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    let imagenUrlFinal: string | null = nuevo.imagen_url || null;

    try {
      // ✅ si seleccionó archivo, súbelo a Storage
      if (imagenFile) {
        imagenUrlFinal = await subirImagenASupabase(imagenFile);
      }

      const dataToSave = {
        nombre: nuevo.nombre,
        descripcion: nuevo.descripcion,
        precio: Number(nuevo.precio),
        activo: !!nuevo.activo,
        imagen_url: imagenUrlFinal,
      };

      const { error } = editando?.id
        ? await supabase.from("platillos").update(dataToSave).eq("id", editando.id)
        : await supabase.from("platillos").insert([dataToSave]);

      if (error) {
        console.error("❌ Error guardando platillo:", error);
        alert(`No se pudo guardar el platillo: ${error.message}`);
        return;
      }

      alert(editando ? "Platillo actualizado" : "Platillo agregado");

      setNuevo({
        nombre: "",
        descripcion: "",
        precio: 0,
        activo: true,
        imagen_url: "",
      });

      setImagenFile(null);
      setEditando(null);
      setSeleccionadoId(null);
      fetchPlatillos();
    } catch (e: any) {
      console.error("❌ Error subiendo imagen/guardando:", e);
      alert(`No se pudo subir la imagen: ${e?.message || "sin mensaje"}`);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este platillo?")) return;

    const { error } = await supabase.from("platillos").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("No se pudo eliminar");
    } else {
      alert("Platillo eliminado");
      if (seleccionadoId === id) setSeleccionadoId(null);
      fetchPlatillos();
    }
  };

  const handleEditar = (p: Platillo) => {
    setNuevo({ ...p });
    setEditando(p);
    setImagenFile(null);
    if (p.id) setSeleccionadoId(p.id);
  };

  const seleccionado = useMemo(() => {
    if (seleccionadoId == null) return null;
    return platillos.find((x) => x.id === seleccionadoId) || null;
  }, [platillos, seleccionadoId]);

  const badgeStyle = (activo: boolean): CSSProperties => ({
    ...S.badge,
    borderColor: activo ? "rgba(34,197,94,.40)" : "rgba(239,68,68,.40)",
    background: activo ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)",
    color: activo ? "#22C55E" : "#EF4444",
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
                activo: true,
                imagen_url: "",
              });
              setImagenFile(null);
              setSeleccionadoId(null);
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

          {/* File */}
          <div style={S.fileWrap}>
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImagenFile(file);

                // ✅ permite volver a elegir el mismo archivo
                e.currentTarget.value = "";
              }}
              style={{ display: "none" }}
            />

            <button
              type="button"
              className="btnSoft"
              style={S.fileButton}
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              {imagenFile ? `Imagen: ${imagenFile.name}` : "Subir imagen"}
            </button>
          </div>

          {/* ✅ checkbox usa activo */}
          <label style={S.label}>
            <input
              type="checkbox"
              checked={nuevo.activo}
              onChange={(e) => setNuevo({ ...nuevo, activo: e.target.checked })}
            />
            Disponible
          </label>

          <button
            className="btnPrimary"
            onClick={handleGuardar}
            style={{
              ...S.btnGuardar,
              opacity: isSaving ? 0.65 : 1,
              pointerEvents: isSaving ? "none" : "auto",
            }}
            disabled={isSaving}
          >
            {isSaving ? "Guardando..." : editando ? "Guardar" : "Crear"}
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

            <div style={S.tableBody} className="tableBodyFix">
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
                      ${Number(p.precio).toFixed(2)}
                    </div>

                    <div style={{ ...S.td, flex: 1.2 }}>
                      <span style={badgeStyle(p.activo)}>
                        {p.activo ? "Disponible" : "No disponible"}
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
                      <span style={badgeStyle(seleccionado.activo)}>
                        {seleccionado.activo ? "Disponible" : "No disponible"}
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
                  <div style={S.sideValueStrong}>
                    ${Number(seleccionado.precio).toFixed(2)}
                  </div>
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

/* ===== CSS (tu estilo original) ===== */
const css = `
.row:hover { background: rgba(255,255,255,0.03); }
.rowActive { background: rgba(124,58,237,0.10); }

.btnPrimary:hover { transform: translateY(-1px); opacity: .98; }
.btnPrimary:active { transform: translateY(0px); opacity: .96; }
.btnSoft:hover { transform: translateY(-1px); }
.btnSoft:active { transform: translateY(0px); }
.btnDanger:hover { transform: translateY(-1px); opacity: .98; }
.btnDanger:active { transform: translateY(0px); opacity: .96; }

.btnPrimary[disabled] { opacity: .65; cursor: not-allowed; transform: none; }

@media (max-width: 1050px){
  .platillos-grid {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 640px) {

  .platillos-grid {
    grid-template-columns: 1fr !important;
    gap: 16px;
  }

  .tableHeaderRow {
    display: none !important;
  }

  .row {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 8px;
    padding: 14px !important;
  }

  .row > div {
    width: 100% !important;
    flex: none !important;
    text-align: left !important;
    white-space: normal !important;
  }

  .row > div:nth-child(4) {
    font-size: 16px;
    font-weight: 900;
    color: #A855F7;
  }

  .row > div:last-child {
    margin-top: 6px;
  }
}

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

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
  
}
  /* ==== FIX OVERFLOW / BARRAS RARAS ==== */

/* el grid debe permitir que las columnas se encojan */
.platillos-grid {
  overflow: hidden;
}

/* MUY importante: permite que los hijos no se salgan */
.platillos-grid > div {
  min-width: 0;
}

/* las cards no deben dejar que algo se salga */
.platillos-grid > div {
  overflow: hidden;
}

/* evita la barra horizontal fea */
body {
  overflow-x: hidden;
}

/* tu tabla: el área que scrollea es solo el body */
.tableBodyFix {
  max-height: 520px;   /* ajusta si quieres */
  overflow-y: auto;
  overflow-x: hidden;
}

/* suaviza el scroll y quita rebotes raros */
.tableBodyFix::-webkit-scrollbar {
  width: 10px;
}
.tableBodyFix::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.12);
  border-radius: 999px;
}
.tableBodyFix::-webkit-scrollbar-track {
  background: rgba(255,255,255,0.04);
}
.tableBodyFix {  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.12) rgba(255,255,255,0.04);  -ms-overflow-style: none; /* IE and Edge */
}
.tableBodyFix::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
`;

/* ===== Styles (tu estilo original) ===== */
const S: Record<string, CSSProperties> = {
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
    fontSize: 20,
    fontWeight: 1000,
    color: "#EAF0FF",
  },
  subtitle: {
    fontSize: 17,
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
    gridTemplateColumns: "1fr 1.8fr 1fr 1.72fr auto auto",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: 19,
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
    fontWeight: 1000,
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
    overflow: "hidden", // ✅
  },


  tableHeaderRow: {
    display: "flex",
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(10,16,32,0.35)",
  },
  th: {
    fontSize: 16,
    fontWeight: 1000,
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
    fontSize: 17,
    fontWeight: 1000,
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
    fontWeight: 1000,
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
  sideName: { fontSize: 20, fontWeight: 1000, color: "#EAF0FF" },
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
    fontWeight: 1000,
    background: "rgba(10,16,32,0.35)",
  },

  sideSection: { paddingTop: 12 },
  sideLabel: {
    fontSize: 15,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "rgba(226,232,240,0.62)",
    fontWeight: 1000,
  },
  sideValue: {
    marginTop: 6,
    color: "rgba(226,232,240,0.86)",
    fontSize: 14,
    lineHeight: 1.45,
  },
  sideValueStrong: {
    marginTop: 6,
    color: "#EAF0FF",
    fontSize: 18,
    fontWeight: 1000,
  },

  sideActions: { display: "flex", gap: 10, marginTop: 16 },
  btnEditar: {
    flex: 1,
    background: "rgba(59,130,246,0.16)",
    color: "#BFDBFE",
    border: "1px solid rgba(59,130,246,0.28)",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 1000,
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
    fontWeight: 1000,
    transition: "transform 120ms ease, opacity 120ms ease",
  },
  fileWrap: {
    display: "flex",
    width: "100%",
  },

  fileButton: {
    flex: 1,
    width: "100%",
    background: "rgba(124,58,237,.14)",
    color: "#E9D5FF",
    border: "1px dashed rgba(124,58,237,.45)",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
    textAlign: "left",
  },
};
