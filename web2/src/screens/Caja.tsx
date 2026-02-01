import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { COLORS } from "../styles/theme";

interface DetallePedido {
  cantidad: number;
  precio_unitario: number;
  nota: string | null;
  platillos: { nombre: string | null; descripcion?: string | null } | null;
}

interface Pedido {
  id: number;
  numero_mesa: number;
  estado: string;
  total: number | null;
  detalle_pedidos: DetallePedido[];
}

export default function Caja() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  const fetchPedidos = async () => {
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        numero_mesa,
        estado,
        detalle_pedidos:detalle_pedidos (
          cantidad,
          precio_unitario,
          nota,
          platillos:platillo_id (nombre, descripcion)
        )
      `)
      .in("estado", ["Pendiente de cobro", "Entregado"])
      .order("id", { ascending: false });

    if (error) {
      console.error("❌ Error al traer pedidos:", error.message);
      return;
    }

    const pedidosData = (data || []).map((p: any) => {
      const totalPedido = (p.detalle_pedidos || []).reduce(
        (acc: number, d: any) => acc + d.cantidad * d.precio_unitario,
        0
      );
      return { ...p, total: totalPedido };
    });

    setPedidos(pedidosData);
  };

  useEffect(() => {
    fetchPedidos();

    const channel = supabase
      .channel("realtime-caja")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, (payload) => {
        if (["Pendiente de cobro", "Entregado"].includes(payload.new?.estado)) {
          fetchPedidos();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const registrarVenta = async (pedido: Pedido) => {
    try {
      const detalles = pedido.detalle_pedidos || [];
      if (detalles.length === 0) return;

      const ventas = detalles.map((d) => ({
        pedido_id: pedido.id,
        numero_mesa: pedido.numero_mesa,
        platillo: d.platillos?.nombre || "Desconocido",
        descripcion: d.platillos?.descripcion || "",
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        fecha: new Date().toISOString().split("T")[0],
      }));

      const { error } = await supabase.from("ventas_diarias").insert(ventas);
      if (error) throw error;

      console.log(`✅ Ventas registradas del pedido #${pedido.id}`);
    } catch (error: any) {
      console.error("❌ Error registrando venta:", error.message);
    }
  };

  const marcarEntregado = async (pedido: Pedido) => {
    const { error } = await supabase
      .from("pedidos")
      .update({ estado: "Entregado" })
      .eq("id", pedido.id);

    if (error) {
      alert("❌ Error al marcar como entregado");
      console.error(error);
      return;
    }

    await registrarVenta(pedido);
    alert(`💰 Pedido #${pedido.id} cobrado y guardado en ventas diarias`);
    fetchPedidos();
  };

  const totalGeneral = useMemo(() => {
    return pedidos
      .filter((p) => p.estado === "Pendiente de cobro")
      .reduce((acc, p) => acc + (p.total || 0), 0);
  }, [pedidos]);

  const estadoColor = (estado: string) => {
    if (estado === "Pendiente de cobro") return "#F59E0B";
    if (estado === "Entregado") return "#10B981";
    return "#94A3B8";
  };

  return (
    <div style={S.page}>
      <style>{css}</style>

      <div style={S.wrap}>
        <div style={S.topTitle}>Sistema de Restaurante</div>
        <h1 style={S.title}>Caja</h1>

        {/* Resumen arriba */}
        <div style={S.kpiRow}>
          <div style={S.kpiCard}>
            <div style={S.kpiLabel}>Pendientes</div>
            <div style={S.kpiValue}>
              {pedidos.filter((p) => p.estado === "Pendiente de cobro").length}
            </div>
          </div>

          <div style={S.kpiCard}>
            <div style={S.kpiLabel}>Total a cobrar</div>
            <div style={S.kpiValue}>${totalGeneral.toFixed(2)}</div>
          </div>

          <div style={S.kpiCard}>
            <div style={S.kpiLabel}>Entregados</div>
            <div style={S.kpiValue}>
              {pedidos.filter((p) => p.estado === "Entregado").length}
            </div>
          </div>
        </div>

        {pedidos.length === 0 ? (
          <div style={S.emptyWrap}>
            <div style={S.emptyIcon}>⬚</div>
            <div style={S.emptyTitle}>No hay pedidos</div>
            <div style={S.emptyText}>Cuando haya pedidos por cobrar, aparecerán aquí.</div>
          </div>
        ) : (
          <div style={S.grid}>
            {pedidos.map((p) => (
              <div key={p.id} style={S.card} className="cardHover">
                <div style={S.headerRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={S.cardTitle}>Pedido #{p.id}</div>
                    <span
                      style={{
                        ...S.estado,
                        background: `${estadoColor(p.estado)}22`,
                        border: `1px solid ${estadoColor(p.estado)}33`,
                        color: estadoColor(p.estado),
                      }}
                    >
                      {p.estado.toUpperCase()}
                    </span>
                  </div>

                  <div style={S.mesa}>Mesa {p.numero_mesa}</div>
                </div>

                <div style={S.detalleBox}>
                  {p.detalle_pedidos.length > 0 ? (
                    p.detalle_pedidos.map((d, i) => (
                      <div key={i} style={S.detalleItem} className="rowHover">
                        <div style={{ minWidth: 0 }}>
                          <div style={S.platillo}>
                            {d.platillos?.nombre || "Platillo"}{" "}
                            <span style={S.qty}>×{d.cantidad}</span>
                          </div>
                          {d.nota && <div style={S.nota}>📝 {d.nota}</div>}
                        </div>

                        <div style={S.precio}>
                          ${(d.cantidad * d.precio_unitario).toFixed(2)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={S.vacio}>⚠️ Sin detalles registrados</div>
                  )}
                </div>

                <div style={S.totalBar}>
                  <span style={S.totalLabel}>Total</span>
                  <span style={S.totalValue}>${p.total?.toFixed(2)}</span>
                </div>

                {p.estado === "Pendiente de cobro" && (
                  <button onClick={() => marcarEntregado(p)} style={S.btnCobrar} className="btnPrimary">
                    ✅ Cobrar y marcar como entregado
                  </button>
                )}

                {p.estado === "Entregado" && (
                  <button style={S.btnDisabled} disabled>
                    ✅ Pedido entregado
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== CSS (micro animaciones + responsive) ===== */
const css = `
  .cardHover { transition: transform 140ms ease, box-shadow 140ms ease; }
  .cardHover:hover { transform: translateY(-2px); }
  .rowHover { transition: background 120ms ease; }
  .rowHover:hover { background: rgba(255,255,255,0.03); }

  .btnPrimary { transition: transform 120ms ease, opacity 120ms ease; }
  .btnPrimary:hover { transform: translateY(-1px); opacity: .98; }
  .btnPrimary:active { transform: translateY(0px); opacity: .96; }

  @media (max-width: 900px){
    .kpiRow { grid-template-columns: 1fr !important; }
  }
`;

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 600px at 50% -120px, rgba(124,58,237,0.16), transparent 60%), linear-gradient(180deg, #0B1220 0%, #0A1020 30%, #070C16 100%)",
    color: "#E5E7EB",
  },
  wrap: { maxWidth: "100%", margin: "0 auto", padding: "42px 24px" },

  topTitle: {
    textAlign: "center",
    color: "rgb(253, 251, 255)",
    fontWeight: 900,
    fontSize: 28,
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: 1000 as const,
    color: "#EAF0FF",
    margin: "0 0 18px",
    textAlign: "center",
  },

  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
    marginBottom: 18,
  },
  kpiCard: {
    background: "rgba(13, 21, 38, 0.72)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },
  kpiLabel: { fontSize: 17, fontWeight: 900, color: "rgba(226,232,240,0.70)" },
  kpiValue: { marginTop: 8, fontSize: 22, fontWeight: 1000 as const, color: "#EAF0FF" },

  emptyWrap: {
    marginTop: 27,
    padding: 24,
    borderRadius: 18,
    background: "rgba(13, 21, 38, 0.72)",
    border: "1px dashed rgba(255,255,255,0.10)",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
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
    marginBottom: 10,
  },
 emptyTitle: {
  fontWeight: 1000 as const,
  color: "#EAF0FF",
  fontSize: 20,        // ⬅️ MÁS GRANDE
  marginBottom: 6,
},

emptyText: {
  marginTop: 6,
  color: "rgba(226,232,240,0.75)",
  fontSize: 19,        // ⬅️ LECTURA CÓMODA
  lineHeight: 1.6,
},

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
    gap: 18,
    justifyContent: "center",
  },

  card: {
    background: "rgba(13, 21, 38, 0.72)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 20, fontWeight: 1000 as const, color: "#EAF0FF" },

  estado: {
    fontWeight: 1000 as const,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 17,
    letterSpacing: 0.3,
    whiteSpace: "nowrap",
  },

  mesa: {
    color: "rgba(226,232,240,0.70)",
    fontSize: 17,
    fontWeight: 900,
    paddingTop: 2,
    whiteSpace: "nowrap",
  },

  detalleBox: {
    background: "rgba(10, 16, 32, 0.35)",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  detalleItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  platillo: { fontSize: 17, fontWeight: 1000 as const, color: "#EAF0FF" },
  qty: { marginLeft: 6, fontSize: 17, fontWeight: 900, color: "rgba(226,232,240,0.60)" },
  nota: { marginTop: 6, fontSize: 17, color: "rgba(226,232,240,0.70)", fontWeight: 800 },

  precio: { fontWeight: 1000 as const, color: "#F472B6", whiteSpace: "nowrap" },

  vacio: { textAlign: "center", color: "rgba(226,232,240,0.70)", padding: 14, fontWeight: 900 },

  totalBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    padding: "10px 2px 0",
  },
  totalLabel: { color: "rgba(226,232,240,0.70)", fontWeight: 1000 as const },
  totalValue: { color: "#EAF0FF", fontWeight: 1000 as const, fontSize: 17 },

  btnCobrar: {
    marginTop: 14,
    width: "100%",
    backgroundColor: COLORS.primary || "#7C3AED",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: "12px 14px",
    fontWeight: 1000 as const,
    cursor: "pointer",
    fontSize: 17,
    boxShadow: "0 18px 30px rgba(124,58,237,0.20)",
  },
  btnDisabled: {
    marginTop: 14,
    width: "100%",
    background: "rgba(148,163,184,0.16)",
    color: "rgba(226,232,240,0.60)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "12px 14px",
    fontWeight: 1000 as any,
    cursor: "not-allowed",
    fontSize: 15,
  },
};
