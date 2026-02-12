import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { COLORS } from "../styles/theme";

interface Platillo {
  nombre: string | null;
  descripcion: string | null;
}

interface DetallePedido {
  id: number;
  cantidad: number;
  precio_unitario: number;
  nota: string | null;
  platillos: Platillo | null;
}

interface Pedido {
  id: number;
  numero_mesa: number;
  estado: string;
  created_at: string;
  detalle_pedidos: DetallePedido[];
}

export default function Cocina() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const MESAS = useMemo(() => Array.from({ length: 10 }, (_, i) => i + 1), []);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<number>(1);

  useEffect(() => {
    fetchPedidos();

    const channel = supabase
      .channel("realtime-cocina")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () =>
        fetchPedidos()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "detalle_pedidos" },
        () => fetchPedidos()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPedidos = async (): Promise<void> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pedidos")
        .select(`
          id,
          numero_mesa,
          estado,
          created_at,
          detalle_pedidos (
            id,
            cantidad,
            precio_unitario,
            nota,
            platillos (nombre, descripcion)
          )
        `)
        .in("estado", ["Enviado", "Listo"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data) {
        setPedidos([]);
        return;
      }

      const pedidosTipados: Pedido[] = data.map((p: any) => ({
        id: p.id,
        numero_mesa: p.numero_mesa,
        estado: p.estado,
        created_at: p.created_at,
        detalle_pedidos: (p.detalle_pedidos || []).map((d: any) => ({
          id: d.id,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          nota: d.nota,
          platillos: d.platillos
            ? { nombre: d.platillos.nombre, descripcion: d.platillos.descripcion }
            : { nombre: "Desconocido", descripcion: "Sin descripción" },
        })),
      }));

      setPedidos(pedidosTipados);
    } catch (err) {
      console.error(" Error cargando pedidos:", err);
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  const marcarListo = async (pedido: Pedido): Promise<void> => {
    try {
      const total = pedido.detalle_pedidos.reduce(
        (acc, d) => acc + d.precio_unitario * d.cantidad,
        0
      );

      const { error } = await supabase
        .from("pedidos")
        .update({ estado: "Listo", total })
        .eq("id", pedido.id);

      if (error) throw error;

      alert(` Pedido #${pedido.id} marcado como listo`);
      fetchPedidos();
    } catch (err) {
      console.error(" Error al marcar como listo:", err);
      alert(" No se pudo marcar como listo");
    }
  };

  // mapa por mesa (el más reciente)
  const ultimoPedidoPorMesa = useMemo(() => {
    const map = new Map<number, Pedido>();
    for (const p of pedidos) {
      if (!map.has(p.numero_mesa)) map.set(p.numero_mesa, p);
    }
    return map;
  }, [pedidos]);

  const pedidoSeleccionado = useMemo(() => {
    return ultimoPedidoPorMesa.get(mesaSeleccionada) || null;
  }, [ultimoPedidoPorMesa, mesaSeleccionada]);

  // 🎨 Colores coherentes con tu dark UI
  const mesaColor = (estado?: string) => {
    if (!estado) return "#94A3B8"; // Libre (slate)
    if (estado === "Enviado") return "#F59E0B"; // amber
    if (estado === "Listo") return "#10B981"; // emerald
    return "#3B82F6"; // blue fallback
  };

  const mesaBadge = (estado?: string) => {
    if (!estado) return "LIBRE";
    return estado.toUpperCase();
  };

  return (
    <div style={S.page}>
      <style>{css}</style>

      <div style={S.wrap}>
        <div style={S.topTitle}>
          <span style={S.topTitleText}>Sistema de Restaurante</span>
        </div>

        <h1 style={S.title}>Pedidos en cocina</h1>

        {loading && (
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <p style={S.loaderText}>Cargando pedidos...</p>
          </div>
        )}

        {!loading && (
          <div className="cocina-grid" style={S.layout}>
            {/* LEFT: Mesas */}
            <div style={S.panel}>
              <div style={S.panelHeader}>
                <div>
                  <h3 style={S.panelTitle}>Mesas</h3>
                  <p style={S.panelSub}>Selecciona una mesa para ver su pedido.</p>
                </div>

                <div style={S.legend}>
                  <span style={S.legendItem}>
                    <span style={{ ...S.legendDot, background: "#94A3B8" }} /> Libre
                  </span>
                  <span style={S.legendItem}>
                    <span style={{ ...S.legendDot, background: "#F59E0B" }} /> Enviado
                  </span>
                  <span style={S.legendItem}>
                    <span style={{ ...S.legendDot, background: "#10B981" }} /> Listo
                  </span>
                </div>
              </div>

              <div style={S.mesasGrid}>
                {MESAS.map((mesa) => {
                  const p = ultimoPedidoPorMesa.get(mesa);
                  const estado = p?.estado;
                  const selected = mesaSeleccionada === mesa;
                  const c = mesaColor(estado);

                  return (
                    <button
                      key={mesa}
                      onClick={() => setMesaSeleccionada(mesa)}
                      className={`mesa-btn ${selected ? "is-selected" : ""}`}
                      style={{
                        ...S.mesaBtn,
                        borderColor: selected ? c : "rgba(255,255,255,0.08)",
                        boxShadow: selected ? `0 18px 30px ${c}22` : S.mesaBtn.boxShadow,
                      }}
                    >
                      <div style={S.mesaTopRow}>
                        <div style={S.mesaNumero}>{mesa}</div>
                        <span
                          style={{
                            ...S.pill,
                            background: `${c}22`,
                            border: `1px solid ${c}33`,
                            color: c,
                          }}
                        >
                          {mesaBadge(estado)}
                        </span>
                      </div>

                      <div style={S.mesaMeta}>
                        {p ? (
                          <span style={S.mesaMetaText}>Pedido #{p.id}</span>
                        ) : (
                          <span style={{ ...S.mesaMetaText, color: "rgba(226,232,240,0.55)" }}>
                            Sin pedido
                          </span>
                        )}
                      </div>

                      {/* dot */}
                      {p && <span style={{ ...S.dot, background: c }} />}
                    </button>
                  );
                })}
              </div>

              {pedidos.length === 0 && (
                <div style={{ ...S.emptyMini, marginTop: 40 }}>
                  <div style={S.emptyMiniIcon}>⬚</div>
                  <div style={S.emptyMiniText}>No hay pedidos enviados</div>
                </div>
              )}
            </div>

            {/* RIGHT: Detalle */}
            <div style={S.panel}>
              {!pedidoSeleccionado ? (
                <div style={S.emptyCard}>
                  <div style={S.emptyIcon}></div>
                  <h3 style={S.emptyTitle}>Mesa {mesaSeleccionada}</h3>
                  <p style={S.emptyText}>Sin pedidos por ahora.</p>
                </div>
              ) : (
                <div>
                  <div style={S.detailHeader}>
                    <div>
                      <div style={S.detailTitle}>
                        Pedido <span style={S.detailHash}>#{pedidoSeleccionado.id}</span>
                      </div>
                      <div style={S.detailSub}>
                        Mesa <b>{pedidoSeleccionado.numero_mesa}</b> •{" "}
                        {new Date(pedidoSeleccionado.created_at).toLocaleString()}
                      </div>
                    </div>

                    <span
                      style={{
                        ...S.statusBadge,
                        background: mesaColor(pedidoSeleccionado.estado),
                        boxShadow: `0 16px 28px ${mesaColor(pedidoSeleccionado.estado)}33`,
                      }}
                    >
                      {pedidoSeleccionado.estado.toUpperCase()}
                    </span>
                  </div>

                  <div style={S.divider} />

                  <div style={S.detailBox}>
                    {pedidoSeleccionado.detalle_pedidos.length > 0 ? (
                      pedidoSeleccionado.detalle_pedidos.map((detalle) => {
                        const subtotal = detalle.precio_unitario * detalle.cantidad;
                        return (
                          <div key={detalle.id} style={S.itemRow} className="itemRow">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={S.itemName}>
                                {detalle.platillos?.nombre || "Platillo"}{" "}
                                <span style={S.itemQty}>× {detalle.cantidad}</span>
                              </div>

                              {detalle.platillos?.descripcion && (
                                <div style={S.itemDesc}>{detalle.platillos.descripcion}</div>
                              )}

                              {detalle.nota && <div style={S.itemNote}> {detalle.nota}</div>}
                            </div>

                            <div style={S.itemPrice}>
                              ${subtotal.toFixed(2)}
                              <div style={S.itemUnit}>
                                ${detalle.precio_unitario.toFixed(2)} c/u
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={S.emptyInside}> Sin platillos registrados</div>
                    )}
                  </div>

                  <div style={S.actions}>
                    {pedidoSeleccionado.estado === "Enviado" && (
                      <button
                        className="primaryBtn"
                        style={S.btnPrimary}
                        onClick={() => marcarListo(pedidoSeleccionado)}
                      >
                         Marcar como listo
                      </button>
                    )}

                    {pedidoSeleccionado.estado === "Listo" && (
                      <button style={S.btnDisabled} disabled>
                         Pedido listo para entregar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** ===== CSS (hover/anim/responsive) ===== */
const css = `
  .mesa-btn:hover {
    transform: translateY(-2px) scale(1.01);
  }

  .mesa-btn:active {
    transform: translateY(0px) scale(0.995);
  }

  .primaryBtn:hover {
    transform: translateY(-1px);
    opacity: .98;
  }

  .primaryBtn:active {
    transform: translateY(0px);
    opacity: .96;
  }

  .itemRow:hover {
    background: rgba(255,255,255,0.03);
  }

  /* ===== TABLET Y ABAJO ===== */
  @media (max-width: 1020px){
    .cocina-grid {
      grid-template-columns: 1fr !important;
    }
  }

  /* ===== TELÉFONO ===== */
  @media (max-width: 640px){
    .cocina-grid {
      grid-template-columns: 1fr !important;
      gap: 16px;
    }

    h1 {
      font-size: 26px !important;
    }

    .mesa-btn {
      padding: 16px !important;
    }

    .panel {
      min-height: auto !important;
    }
  }
`;

/** ===== Styles ===== */
const S: Record<string, React.CSSProperties> = {
 page: {
  minHeight: "100vh",
  overflowX: "hidden", 
  background:
    "radial-gradient(1200px 600px at 50% -120px, rgba(124,58,237,0.20), transparent 60%), linear-gradient(180deg, #0B1220 0%, #0A1020 30%, #070C16 100%)",
  color: "#E5E7EB",
},

wrap: {
  maxWidth: "100%",
  margin: "0 auto",
  padding: "28px 32px",
  minHeight: "calc(100vh - 120px)", // usa espacio vertical
},

  topTitle: { display: "flex", justifyContent: "center", marginBottom: 18 },
  topTitleText: {
    color: "#efefef",
    fontWeight: 900,
    fontSize: 22,
    letterSpacing: 0.2,
    textShadow: "0 10px 26px rgba(168,85,247,0.18)",
  },

  title: {
    fontSize: 28,
    fontWeight: 900,
    color: "#EAF0FF",
    margin: "8px 0 18px",
    textAlign: "center",
  },

  loadingWrap: {
    display: "grid",
    placeItems: "center",
    gap: 10,
    marginTop: 30,
  },
  spinner: {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "3px solid rgba(255,255,255,0.12)",
    borderTopColor: "#A855F7",
    animation: "spin 900ms linear infinite",
  },
  loaderText: { margin: 0, color: "rgba(226,232,240,0.75)", fontWeight: 700 },

  layout: {
  display: "grid",
  gridTemplateColumns: "710px 1fr",
  gap: 18,
  alignItems: "start",
},

  panel: {
  background: "rgba(13, 21, 38, 0.72)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
  backdropFilter: "blur(10px)",
  minHeight: 420, //  clave
},

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  panelTitle: { margin: 0, fontSize: 32, fontWeight: 900, color: "#EAF0FF" },
  panelSub: { margin: "6px 0 0", fontSize: 20, color: "rgba(226,232,240,0.65)" },

  legend: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 16, color: "rgba(226,232,240,0.72)" },
  legendDot: { width: 10, height: 10, borderRadius: 99, display: "inline-block" },

  mesasGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 16,
  marginTop: 25,
},


  mesaBtn: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(10, 16, 32, 0.55)",
    cursor: "pointer",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 15,
    textAlign: "left",
    transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
    boxShadow: "0 12px 22px rgba(0,0,0,0.25)",
  },
  mesaTopRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  mesaNumero: { fontSize: 26, fontWeight: 1000 as const, color: "#FFFFFF", lineHeight: 1 },
  mesaMeta: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  mesaMetaText: { fontSize: 12, fontWeight: 800, color: "rgba(226,232,240,0.75)" },

  pill: {
    fontSize: 11,
    fontWeight: 1000 as const,
    padding: "6px 10px",
    borderRadius: 999,
    letterSpacing: 0.4,
  },

  dot: { position: "absolute", top: 12, left: 12, width: 10, height: 10, borderRadius: 99 },

  emptyMini: {
    padding: 14,
    borderRadius: 16,
    background: "rgba(10, 16, 32, 0.35)",
    border: "1px dashed rgba(255,255,255,0.10)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  emptyMiniIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(226,232,240,0.7)",
  },
  emptyMiniText: { fontWeight: 900, color: "rgba(226,232,240,0.78)" },

emptyCard: {
  minHeight: 260,             
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 90,                     
  textAlign: "center",
  padding: 25,                
  borderRadius: 16,
  background: "rgba(10, 16, 32, 0.35)",
  border: "1px dashed rgba(255,255,255,0.10)",
},
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 8,
    fontSize: 26,
  },
  emptyTitle: { margin: 0, fontSize: 32, fontWeight: 1000 as any, color: "#EAF0FF" },
  emptyText: { marginTop: 8, color: "rgba(226,232,240,0.7)", fontSize: 20, fontWeight: 700 },

  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  detailTitle: { fontSize: 20, fontWeight: 1000 as any, color: "#EAF0FF" },
  detailHash: { color: "#A855F7" },
  detailSub: { marginTop: 6, fontSize: 12, color: "rgba(226,232,240,0.65)", fontWeight: 700 },

  statusBadge: {
    padding: "8px 12px",
    borderRadius: 12,
    color: "#0B1220",
    fontWeight: 1000 as any,
    fontSize: 12,
    letterSpacing: 0.6,
  },

  divider: { height: 1, background: "rgba(255,255,255,0.08)", margin: "14px 0" },

  detailBox: {
    background: "rgba(10, 16, 32, 0.35)",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    overflow: "hidden",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    transition: "background 120ms ease",
  },
  itemName: { fontSize: 14, fontWeight: 1000 as any, color: "#EAF0FF" },
  itemQty: { color: "rgba(226,232,240,0.65)", fontWeight: 900, marginLeft: 6 },
  itemDesc: { marginTop: 6, fontSize: 12, color: "rgba(226,232,240,0.62)" },
  itemNote: { marginTop: 6, fontSize: 12, color: "rgba(226,232,240,0.78)" },

  itemPrice: { textAlign: "right", fontWeight: 1000 as any, color: "#F472B6", whiteSpace: "nowrap" },
  itemUnit: { marginTop: 4, fontSize: 11, fontWeight: 800, color: "rgba(226,232,240,0.55)" },

  emptyInside: { padding: 16, textAlign: "center", color: "rgba(226,232,240,0.7)", fontWeight: 800 },

  actions: { marginTop: 14 },

  btnPrimary: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: "14px 16px",
    background: COLORS.primary || "#7C3AED",
    color: "#fff",
    fontWeight: 1000 as any,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 18px 30px rgba(124,58,237,0.25)",
    transition: "transform 120ms ease, opacity 120ms ease",
  },
  btnDisabled: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "14px 16px",
    background: "rgba(148,163,184,0.18)",
    color: "rgba(226,232,240,0.65)",
    fontWeight: 1000 as any,
    fontSize: 15,
    cursor: "not-allowed",
  },
};

/** spinner keyframes (inline workaround) */
const styleEl = document?.createElement?.("style");
if (styleEl && !document.getElementById("spin-keyframes")) {
  styleEl.id = "spin-keyframes";
  styleEl.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleEl);
}
