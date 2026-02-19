import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COLORS } from "../styles/theme";

interface Venta {
  pedido_id: number;
  numero_mesa: number | null;
  fecha: string;
  platillo: string;
  descripcion: string | null;
  cantidad: number;
  precio_unitario: number;
  total: number;
}

export default function Historial() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVentas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaSeleccionada]);

  const fetchVentas = async () => {
    setLoading(true);

    const inicio = `${fechaSeleccionada}T00:00:00`;
    const fin = `${fechaSeleccionada}T23:59:59`;

    const { data, error } = await supabase
      .from("ventas_diarias")
      .select("*")
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .order("pedido_id", { ascending: false });

    if (error) {
      console.error("❌ Error al traer ventas:", error.message);
      setVentas([]);
    } else {
      setVentas((data as Venta[]) || []);
    }

    setLoading(false);
  };

  const metrics = useMemo(() => {
    const totalVentas = ventas.reduce((acc, v) => acc + v.cantidad * v.precio_unitario, 0);
    const pedidosSet = new Set(ventas.map((v) => v.pedido_id));
    const pedidosTotales = pedidosSet.size;
    const promedio = pedidosTotales > 0 ? totalVentas / pedidosTotales : 0;

    return { totalVentas, pedidosTotales, promedio };
  }, [ventas]);

  const generarPDF = () => {
    if (ventas.length === 0) {
      alert("⚠️ No hay ventas para generar el reporte.");
      return;
    }

    const doc = new jsPDF();
    const fechaHora = new Date().toLocaleString();

    doc.setFontSize(18);
    doc.text("Restaurante Villa Duarte", 14, 18);
    doc.setFontSize(12);
    doc.text(`Reporte de ventas del ${fechaSeleccionada}`, 14, 26);
    doc.text(`Generado: ${fechaHora}`, 14, 32);

    const tableData = ventas.map((v) => [
      v.pedido_id,
      v.numero_mesa ? `Mesa ${v.numero_mesa}` : "Para llevar",
      v.platillo,
      v.descripcion || "-",
      v.cantidad,
      `$${v.precio_unitario.toFixed(2)}`,
      `$${(v.cantidad * v.precio_unitario).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 38,
      head: [["Pedido", "Mesa", "Platillo", "Descripción", "Cant.", "P. Unitario", "Subtotal"]],
      body: tableData,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 38;
    const totalGeneral = ventas.reduce((acc, v) => acc + v.cantidad * v.precio_unitario, 0);
    const totalPlatillos = ventas.reduce((acc, v) => acc + v.cantidad, 0);

    doc.setFontSize(14);
    doc.text(`Total de platillos: ${totalPlatillos}`, 14, finalY + 10);
    doc.text(`Total general: $${totalGeneral.toFixed(2)}`, 14, finalY + 18);

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.text(
      "Generado automáticamente por el sistema de ventas — Restaurante Villa Duarte",
      14,
      pageHeight - 10
    );

    doc.save(`reporte_ventas_${fechaSeleccionada}.pdf`);
  };

  const formatMoney = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  const IconCircle = ({
    children,
    tint = "purple",
  }: {
    children: React.ReactNode;
    tint?: "purple" | "blue" | "pink";
  }) => {
    const map = {
      purple: { bg: "rgba(124, 58, 237, 0.18)", ring: "rgba(124, 58, 237, 0.35)" },
      blue: { bg: "rgba(59, 130, 246, 0.16)", ring: "rgba(59, 130, 246, 0.32)" },
      pink: { bg: "rgba(168, 85, 247, 0.14)", ring: "rgba(168, 85, 247, 0.30)" },
    }[tint];

    return (
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          background: map.bg,
          border: `1px solid ${map.ring}`,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
        }}
      >
        {children}
      </div>
    );
  };

  return (
    <div style={S.page}>
      <style>{`
        /* ===== FIX: NO DESBORDE / MOBILE SAFE ===== */
        html, body { overflow-x: hidden; }
        * { box-sizing: border-box; }

        .wrap {
          max-width: 100%;
          width: 100%;
          margin: 0 auto;
          padding: 36px 32px;
          overflow: hidden; /* evita desborde del layout */
        }

        .cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr)); /* ✅ minmax para que no se salga */
          gap: 22px;
        }
        .cards > * { min-width: 0; } /* ✅ evita que los cards empujen horizontal */

        .stack { display: grid; gap: 22px; margin-top: 22px; }
        .stack > * { min-width: 0; }

        /* ✅ scroll horizontal SOLO dentro de la tabla */
        .tableScroll {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
        }

        /* ✅ si la tabla es más ancha, que scrollee adentro y NO rompa la pantalla */
        .tableScroll table { min-width: 860px; }

        @media (max-width: 980px) {
          .cards { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .wrap { padding: 22px 14px; } /* ✅ más compacto en móvil */
          .tableScroll table { min-width: 760px; } /* ✅ reduce un poco el ancho mínimo */
        }

        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.85;
          cursor: pointer;
          transform: scale(1.7);
        }
      `}</style>

      <div className="wrap">
        {/* Title (centered like screenshot top) */}
        <div style={S.topTitle}>
          <span style={S.topTitleText}>Sistema de Restaurante</span>
        </div>

        {/* Section title */}
        <h2 style={S.h2}>Historial de Ventas</h2>

        {/* KPI cards */}
        <div className="cards">
          <div style={S.kpiCard}>
            <div style={S.kpiRow}>
              <IconCircle tint="purple">
                <span style={{ color: "#C4B5FD", fontSize: 18, fontWeight: 800 }}>$</span>
              </IconCircle>
              <div>
                <div style={S.kpiLabel}>Total Ventas</div>
                <div style={S.kpiValue}>{formatMoney(metrics.totalVentas)}</div>
              </div>
            </div>
          </div>

          <div style={S.kpiCard}>
            <div style={S.kpiRow}>
              <IconCircle tint="blue">
                <span style={{ color: "#93C5FD", fontSize: 18, fontWeight: 800 }}>⬢</span>
              </IconCircle>
              <div>
                <div style={S.kpiLabel}>Pedidos Totales</div>
                <div style={S.kpiValue}>{metrics.pedidosTotales}</div>
              </div>
            </div>
          </div>

          <div style={S.kpiCard}>
            <div style={S.kpiRow}>
              <IconCircle tint="pink">
                <span style={{ color: "#E9D5FF", fontSize: 18, fontWeight: 800 }}>▦</span>
              </IconCircle>
              <div>
                <div style={S.kpiLabel}>Promedio por Pedido</div>
                <div style={S.kpiValue}>{formatMoney(metrics.promedio)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="stack">
          {/* Filter card */}
          <div style={S.panel}>
            <div style={S.panelLabel}>Filtrar por fecha</div>

            <div style={S.filterRow}>
              <div style={S.dateWrap}>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={(e) => setFechaSeleccionada(e.target.value)}
                  style={S.dateInput}
                />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                onClick={generarPDF}
                style={S.pdfBtn}
                disabled={ventas.length === 0}
                title={ventas.length === 0 ? "No hay ventas para descargar" : "Descargar PDF"}
              >
                Descargar PDF
              </button>
            </div>
          </div>

          {/* Table / Empty */}
          <div style={S.panel}>
            {loading ? (
              <div style={S.emptyWrap}>
                <div style={S.muted}>Cargando ventas...</div>
              </div>
            ) : ventas.length === 0 ? (
              <div style={S.emptyWrap}>
                <div style={S.emptyIcon}>⬚</div>
                <div style={S.emptyText}>No hay ventas registradas</div>
              </div>
            ) : (
              <div className="tableScroll">
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Pedido</th>
                      <th style={S.th}>Mesa</th>
                      <th style={S.th}>Platillo</th>
                      <th style={S.th}>Descripción</th>
                      <th style={S.thRight}>Cant.</th>
                      <th style={S.thRight}>P. Unitario</th>
                      <th style={S.thRight}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((v, i) => (
                      <tr key={`${v.pedido_id}-${i}`} style={S.tr}>
                        <td style={S.td}>#{v.pedido_id}</td>
                        <td style={S.td}>{v.numero_mesa ? `Mesa ${v.numero_mesa}` : "Para llevar"}</td>
                        <td style={S.td}>{v.platillo}</td>
                        <td style={S.tdMuted}>{v.descripcion || "-"}</td>
                        <td style={S.tdRight}>{v.cantidad}</td>
                        <td style={S.tdRight}>{formatMoney(v.precio_unitario)}</td>
                        <td style={S.tdRight}>{formatMoney(v.cantidad * v.precio_unitario)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={S.totalBar}>
                  <span style={S.totalLabel}>Total del día</span>
                  <span style={S.totalValue}>{formatMoney(metrics.totalVentas)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* tiny footer spacing */}
        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

/** ===== Styles (replica dark Figma) ===== */
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 600px at 50% -120px, rgba(124,58,237,0.18), transparent 60%), linear-gradient(180deg, #0B1220 0%, #0A1020 30%, #070C16 100%)",
    color: "#E5E7EB",
  },

  topTitle: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 24,
  },
  topTitleText: {
    color: "#f5f5f5",
    fontWeight: 800,
    fontSize: 32,
    letterSpacing: 0.2,
    textShadow: "0 8px 26px rgba(168,85,247,0.18)",
  },

  h2: {
    fontSize: 27,
    fontWeight: 800,
    margin: "6px 0 18px",
    color: "#EAF0FF",
  },

  kpiCard: {
    background: "rgba(13, 21, 38, 0.72)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },
  kpiRow: { display: "flex", alignItems: "center", gap: 14 },
  kpiLabel: {
    fontSize: 17,
    fontWeight: 700,
    color: "rgba(226,232,240,0.82)",
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 900,
    color: "#FFFFFF",
  },

  panel: {
    background: "rgba(13, 21, 38, 0.72)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },
  panelLabel: {
    fontSize: 17,
    fontWeight: 800,
    color: "rgba(226,232,240,0.88)",
    marginBottom: 12,
  },

  filterRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
  },

  dateWrap: {
    position: "relative",
    width: 230,
    maxWidth: "100%",
  },

  dateInput: {
    width: "100%",
    background: "rgba(10, 16, 32, 0.75)",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 16,
    padding: "18px 20px",
    fontSize: 18,
    fontWeight: 900,
    outline: "none",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
  },

  calendarBadge: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    width: 30,
    height: 30,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 14,
    userSelect: "none",
    pointerEvents: "none",
  },

  pdfBtn: {
    background: COLORS.primary || "#7C3AED",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    padding: "18px 22px",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 16px 30px rgba(124,58,237,0.30)",
    transition: "transform 120ms ease, opacity 120ms ease",
  },

  emptyWrap: {
    minHeight: 220,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 18,
    borderRadius: 14,
    background: "rgba(10, 16, 32, 0.35)",
    border: "1px dashed rgba(255,255,255,0.10)",
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(226,232,240,0.65)",
    marginBottom: 10,
    fontSize: 22,
  },
  emptyText: {
    color: "rgba(226,232,240,0.88)",
    fontWeight: 900,
    fontSize: 18,
    letterSpacing: 0.2,
  },
  emptyMini: {
    display: "flex",
    flexDirection: "column",
  },
  muted: { color: "rgba(226,232,240,0.70)", fontWeight: 700 },

  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    padding: "12px 10px",
    fontSize: 12,
    fontWeight: 900,
    color: "rgba(226,232,240,0.9)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  thRight: {
    textAlign: "right",
    padding: "12px 10px",
    fontSize: 12,
    fontWeight: 900,
    color: "rgba(226,232,240,0.9)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  tr: {},
  td: {
    padding: "12px 10px",
    fontSize: 13,
    color: "#EAF0FF",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    whiteSpace: "nowrap",
  },
  tdMuted: {
    padding: "12px 10px",
    fontSize: 13,
    color: "rgba(226,232,240,0.74)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    maxWidth: 320,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tdRight: {
    padding: "12px 10px",
    fontSize: 13,
    color: "#EAF0FF",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  totalBar: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 14,
    paddingTop: 14,
  },
  totalLabel: {
    color: "rgba(226,232,240,0.78)",
    fontWeight: 900,
  },
  totalValue: {
    color: "#A855F7",
    fontWeight: 1000 as const,
    fontSize: 18,
    textShadow: "0 12px 26px rgba(168,85,247,0.18)",
  },
};
