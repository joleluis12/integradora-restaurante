import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { COLORS } from "../styles/theme";

type Estado = "Enviado" | "Listo";

interface Platillo {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  activo?: boolean;
}

interface DetallePedido {
  id: number;
  cantidad: number;
  precio_unitario: number;
  nota: string | null;
  platillos: { nombre: string | null; descripcion: string | null } | null;
}

interface Pedido {
  id: number;
  id_mesero?: string | null;
  estado: Estado | string;
  created_at: string;
  tipo_servicio: string;
  telefono: string | null;
  nombre_cliente: string | null;
  nota?: string | null;
  detalle_pedidos: DetallePedido[];
}

interface CarritoItem {
  platillo: Platillo;
  cantidad: number;
  nota?: string;
}

/** =========================
 *  ALERTAS PRO (SIN alert())
 *  ========================= */
type AlertVariant = "info" | "success" | "warning" | "danger";

function maskPhoneExample(prefix = "653") {
  return `${prefix}xxxxxxx`; 
}

function AlertModal({
  open,
  title,
  message,
  variant = "info",
  onClose,
  actions,
}: {
  open: boolean;
  title: string;
  message: string;
  variant?: AlertVariant;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  if (!open) return null;

  const accent =
    variant === "success"
      ? "#22C55E"
      : variant === "warning"
      ? "#F59E0B"
      : variant === "danger"
      ? "#EF4444"
      : "#A855F7";

  return (
    <div style={AM.backdrop} onMouseDown={onClose} role="dialog" aria-modal="true">
      <div
        style={{ ...AM.card, borderColor: `${accent}55` }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={AM.header}>
          <div style={AM.brand}>Restaurante Villa Duarte</div>
          <button style={AM.close} onClick={onClose} aria-label="Cerrar">
          <span style={AM.closeIcon}>×</span>
          </button>
        </div>

        <div style={{ ...AM.bar, background: accent }} />

        <div style={AM.body}>
          <div style={AM.title}>{title}</div>
          <div style={AM.msg}>{message}</div>

          <div style={AM.actions}>
            {actions ?? (
              <button style={{ ...AM.btn, ...AM.btnPrimary }} onClick={onClose}>
                Aceptar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const AM: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(3, 6, 12, 0.62)",
    backdropFilter: "blur(8px)",
    display: "grid",
    placeItems: "center",
    zIndex: 9999,
    padding: 16,
  },
  card: {
    width: "min(520px, 100%)",
    borderRadius: 18,
    overflow: "hidden",
    background: "rgba(13, 21, 38, 0.92)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
  },
  brand: {
    fontFamily: 'Georgia, "Times New Roman", Times, serif',
    fontSize: 18,
    fontWeight: 700,
    color: "#EAF0FF",
    letterSpacing: 0.2,
  },
 close: {
  width: 36,
  height: 36,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(10,16,32,0.55)",
  color: "rgba(234,240,255,0.95)",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: 0,
  lineHeight: 0,
},

closeIcon: {
  display: "block",
  fontSize: 22,
  lineHeight: 1,
  transform: "translateY(-1px)", 
},

  bar: {
    height: 3,
    width: "100%",
  },
  body: {
    padding: "16px 16px 18px",
  },
  title: {
    fontSize: 18,
    fontWeight: 1000 as any,
    color: "#EAF0FF",
    marginBottom: 8,
  },
  msg: {
    fontSize: 14,
    color: "rgba(226,232,240,0.80)",
    fontWeight: 700,
    lineHeight: 1.5,
    whiteSpace: "pre-line",
  },
  actions: {
    marginTop: 16,
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  btn: {
    borderRadius: 14,
    padding: "10px 14px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(10,16,32,0.55)",
    color: "#EAF0FF",
    fontWeight: 1000 as any,
    cursor: "pointer",
  },
  btnPrimary: {
    background: "#A855F7",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 18px 30px rgba(168,85,247,0.25)",
  },
};

export default function Parallevar() {
  // ====== ALERTAS ======
  const [uiAlert, setUiAlert] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant?: AlertVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const showAlert = (title: string, message: string, variant: AlertVariant = "info") => {
    setUiAlert({ open: true, title, message, variant });
  };

  // ====== data ======
  const [platillos, setPlatillos] = useState<Platillo[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState<number | null>(null);

  // ====== crear pedido ======
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notaPedido, setNotaPedido] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [creando, setCreando] = useState(false);

  // ====== ui ======
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // =========================
  //  TELÉFONO +52 AUTO (MX)
  // =========================
  const limpiarTelefono = (t?: string | null) => String(t || "").replace(/[^\d]/g, "");

  // Si tiene 10 dígitos -> agrega 52
  // Si ya viene con 52... -> lo respeta
  const normalizarTelMX = (telRaw?: string | null) => {
    const tel = limpiarTelefono(telRaw);
    if (!tel) return "";

    if (tel.length === 10) return `52${tel}`; // 10 => 52 + 10
    if (tel.startsWith("52") && tel.length === 12) return tel; // 52 + 10
    return tel;
  };

  const validarTel = (telRaw: string) => {
    const tel = limpiarTelefono(telRaw);
    if (tel.length === 10) return true;
    if (tel.startsWith("52") && tel.length === 12) return true;
    return false;
  };

  const abrirWhatsApp = (telRaw: string | null, msg: string) => {
    const tel = normalizarTelMX(telRaw);

    if (!tel) {
      showAlert("Contacto faltante", "Este pedido no tiene teléfono registrado.", "warning");
      return;
    }

    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    console.log("[Parallevar] mounted");
    fetchAll();

    const channel = supabase
      .channel("realtime-parallevar-full")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
        console.log("[Parallevar] realtime pedidos -> refresh");
        fetchPedidos();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "detalle_pedidos" }, () => {
        console.log("[Parallevar] realtime detalle_pedidos -> refresh");
        fetchPedidos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = async () => {
    await Promise.all([fetchPlatillos(), fetchPedidos()]);
  };

  const fetchPlatillos = async () => {
    try {
      console.log("[Parallevar] fetchPlatillos...");

      const { data, error } = await supabase
        .from("platillos")
        .select("id, nombre, descripcion, precio, activo")
        .order("nombre", { ascending: true });

      if (error) throw error;

      const list = ((data || []) as Platillo[]).filter((p) =>
        p.activo === undefined ? true : p.activo
      );

      console.log("[Parallevar] platillos:", list.length);
      setPlatillos(list);
    } catch (e: any) {
      console.error("[Parallevar] fetchPlatillos error:", e);
      // no bloquea UI; solo log
    }
  };

  const fetchPedidos = async () => {
    try {
      console.log("[Parallevar] fetchPedidos (llevar)...");
      setLoading(true);
      setErrMsg(null);

      const { data, error } = await supabase
        .from("pedidos")
        .select(
          `
          id,
          estado,
          created_at,
          tipo_servicio,
          telefono,
          nombre_cliente,
          nota,
          detalle_pedidos (
            id,
            cantidad,
            precio_unitario,
            nota,
            platillos (nombre, descripcion)
          )
        `
        )
        .eq("tipo_servicio", "llevar")
        .in("estado", ["Enviado", "Listo"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      const typed = (data || []) as Pedido[];
      console.log("[Parallevar] pedidos llevar:", typed.length);

      setPedidos(typed);

      if (!pedidoSeleccionadoId && typed.length > 0) setPedidoSeleccionadoId(typed[0].id);
      if (pedidoSeleccionadoId && !typed.some((p) => p.id === pedidoSeleccionadoId)) {
        setPedidoSeleccionadoId(typed[0]?.id ?? null);
      }
    } catch (e: any) {
      console.error("[Parallevar] fetchPedidos error:", e);
      setErrMsg(e?.message ?? "Error cargando pedidos");
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  const pedidoSeleccionado = useMemo(
    () => pedidos.find((p) => p.id === pedidoSeleccionadoId) || null,
    [pedidos, pedidoSeleccionadoId]
  );

  const platillosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return platillos;
    return platillos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [platillos, busqueda]);

  const totalPedido = (detalles: { cantidad: number; precio_unitario: number }[]) =>
    detalles.reduce((acc, d) => acc + d.cantidad * d.precio_unitario, 0);

  const totalCarrito = useMemo(
    () => carrito.reduce((acc, it) => acc + it.cantidad * it.platillo.precio, 0),
    [carrito]
  );

  const estadoColor = (estado?: string) => {
    if (!estado) return "#94A3B8";
    if (estado === "Enviado") return "#F59E0B";
    if (estado === "Listo") return "#10B981";
    return "#3B82F6";
  };

  // ====== carrito ======
  const addToCarrito = (platillo: Platillo) => {
    setCarrito((prev) => {
      const idx = prev.findIndex((x) => x.platillo.id === platillo.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + 1 };
        return copy;
      }
      return [...prev, { platillo, cantidad: 1 }];
    });
  };

  const changeQty = (platilloId: number, delta: number) => {
    setCarrito((prev) =>
      prev.map((it) =>
        it.platillo.id === platilloId ? { ...it, cantidad: Math.max(1, it.cantidad + delta) } : it
      )
    );
  };

  const removeItem = (platilloId: number) => {
    setCarrito((prev) => prev.filter((it) => it.platillo.id !== platilloId));
  };

  const updateItemNota = (platilloId: number, nota: string) => {
    setCarrito((prev) => prev.map((it) => (it.platillo.id === platilloId ? { ...it, nota } : it)));
  };

  // ====== crear pedido en BD ======
  const crearPedidoParaLlevar = async () => {
    const nom = nombre.trim();

    if (!nom) {
      return showAlert("Datos incompletos", "Escribe el nombre del cliente.", "warning");
    }

    if (!validarTel(telefono)) {
      return showAlert(
        "Datos incompletos",
        `Teléfono inválido. Escribe 10 dígitos.\nEjemplo: ${maskPhoneExample("653")}\n\nNota: El sistema agrega +52 automáticamente.`,
        "warning"
      );
    }

    if (carrito.length === 0) {
      return showAlert("Pedido vacío", "Agrega al menos un platillo antes de crear la orden.", "warning");
    }

    const telNormalizado = normalizarTelMX(telefono);
    console.log("[Parallevar] crearPedidoParaLlevar:", { nom, telNormalizado, items: carrito.length });

    try {
      setCreando(true);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const userId = userRes?.user?.id ?? null;
      console.log("[Parallevar] userId:", userId);

      // 1) crear pedido
      const { data: pedidoIns, error: e1 } = await supabase
        .from("pedidos")
        .insert({
          id_mesero: userId,
          tipo_servicio: "llevar",
          nombre_cliente: nom,
          telefono: telNormalizado,
          estado: "Enviado",
          nota: notaPedido.trim() || null,
          numero_mesa: null,
          ocupantes: null,
        })
        .select("id")
        .single();

      if (e1) throw e1;

      const pedidoId = pedidoIns.id as number;
      console.log("[Parallevar] pedido creado id:", pedidoId);

      // 2) insertar detalle_pedidos
      const rows = carrito.map((it) => ({
        pedido_id: pedidoId,
        platillo_id: it.platillo.id,
        cantidad: it.cantidad,
        precio_unitario: it.platillo.precio,
        subtotal: it.cantidad * it.platillo.precio,
        nota: it.nota?.trim() || null,
      }));

      console.log("[Parallevar] insert detalle rows:", rows.length);

      const { error: e2 } = await supabase.from("detalle_pedidos").insert(rows);
      if (e2) throw e2;

      // 3) limpiar UI
      setNombre("");
      setTelefono("");
      setNotaPedido("");
      setBusqueda("");
      setCarrito([]);

      // 4) refrescar + seleccionar
      await fetchPedidos();
      setPedidoSeleccionadoId(pedidoId);

      // 5) WhatsApp recibida
      abrirWhatsApp(telNormalizado, `Tu orden #${pedidoId} ha sido recibida y está en preparación.`);

      showAlert("Pedido creado", `La orden #${pedidoId} fue registrada correctamente.`, "success");
    } catch (e: any) {
      console.error("[Parallevar] crearPedidoParaLlevar error:", e);

      if (String(e?.message || "").toLowerCase().includes("row-level security")) {
        showAlert(
          "Permiso denegado",
          "Tu usuario no tiene permisos para crear pedidos. Revisa las políticas RLS en Supabase.",
          "danger"
        );
      } else {
        showAlert("No se pudo crear el pedido", e?.message ?? "Intenta de nuevo.", "danger");
      }
    } finally {
      setCreando(false);
    }
  };

  const marcarListo = async (pedido: Pedido) => {
    try {
      console.log("[Parallevar] marcarListo:", pedido.id);

      const total = totalPedido(pedido.detalle_pedidos || []);
      const { error } = await supabase.from("pedidos").update({ estado: "Listo", total }).eq("id", pedido.id);
      if (error) throw error;

      await fetchPedidos();
      abrirWhatsApp(pedido.telefono, `Tu orden #${pedido.id} ya está terminada. Disponible en mostrador.`);

      showAlert("Pedido actualizado", `La orden #${pedido.id} se marcó como lista.`, "success");
    } catch (e: any) {
      console.error("[Parallevar] marcarListo error:", e);
      showAlert("No se pudo marcar como listo", e?.message ?? "Intenta de nuevo.", "danger");
    }
  };

  return (
    <div style={S.page}>
      <style>{css}</style>

      <div style={S.wrap}>
        <div style={S.topTitle}>
          <span style={S.topTitleText}>Sistema de Restaurante</span>
        </div>

        <h1 style={S.title}>Para llevar</h1>

        {/* ===== Crear pedido ===== */}
        <div style={S.panel} className="panel">
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 1000 as any, color: "#EAF0FF" }}>
            Crear orden para llevar
          </h3>

          <div style={S.formGrid}>
            <div>
              <div style={S.label}>Nombre</div>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                style={S.input}
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <div style={S.label}>Teléfono (10 dígitos)</div>

              {/* input con hint de +52 */}
              <div style={S.phoneWrap}>
                <div style={S.phonePrefix}>+52</div>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  style={S.phoneInput}
                  placeholder={maskPhoneExample("653")}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={S.label}>Nota general</div>
              <input
                value={notaPedido}
                onChange={(e) => setNotaPedido(e.target.value)}
                style={S.input}
                placeholder="Ej: Sin cebolla / Salsa aparte..."
              />
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* MENÚ */}
            <div style={S.subPanel}>
              <div style={S.subHeader}>
                <div style={S.subTitle}>Menú</div>
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ ...S.input, height: 42 }}
                  placeholder="Buscar platillo..."
                />
              </div>

              <div style={S.list}>
                {platillosFiltrados.map((p) => (
                  <button key={p.id} className="rowBtn" style={S.rowBtn} onClick={() => addToCarrito(p)}>
                    <div style={{ minWidth: 0 }}>
                      <div style={S.rowName}>{p.nombre}</div>
                      {p.descripcion && <div style={S.rowDesc}>{p.descripcion}</div>}
                    </div>
                    <div style={S.rowRight}>
                      <div style={S.rowPrice}>${Number(p.precio).toFixed(2)}</div>
                      <div style={S.rowAdd}>Agregar</div>
                    </div>
                  </button>
                ))}
                {platillosFiltrados.length === 0 && <div style={S.emptyInside}>No hay platillos que coincidan</div>}
              </div>
            </div>

            {/* CARRITO */}
            <div style={S.subPanel}>
              <div style={S.subHeader}>
                <div style={S.subTitle}>Carrito</div>
                <div style={S.totalMini}>
                  Total: <b style={{ color: "#F472B6" }}>${totalCarrito.toFixed(2)}</b>
                </div>
              </div>

              <div style={S.list}>
                {carrito.map((it) => (
                  <div key={it.platillo.id} style={S.cartItem}>
                    <div style={{ minWidth: 0 }}>
                      <div style={S.rowName}>{it.platillo.nombre}</div>
                      <div style={S.rowDesc}>${it.platillo.precio.toFixed(2)} c/u</div>

                      <input
                        value={it.nota || ""}
                        onChange={(e) => updateItemNota(it.platillo.id, e.target.value)}
                        style={{ ...S.input, marginTop: 8, height: 40 }}
                        placeholder="Nota del platillo (opcional)"
                      />
                    </div>

                    <div style={S.cartRight}>
                      <div style={S.qtyRow}>
                        <button style={S.qtyBtn} onClick={() => changeQty(it.platillo.id, -1)}>
                          -
                        </button>
                        <div style={S.qtyNum}>{it.cantidad}</div>
                        <button style={S.qtyBtn} onClick={() => changeQty(it.platillo.id, +1)}>
                          +
                        </button>
                      </div>

                      <div style={S.rowPrice}>${(it.cantidad * it.platillo.precio).toFixed(2)}</div>

                      <button style={S.removeBtn} onClick={() => removeItem(it.platillo.id)}>
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}

                {carrito.length === 0 && <div style={S.emptyInside}>Agrega platillos del menú</div>}
              </div>

              <button
                className="primaryBtn"
                style={{ ...S.btnPrimary, marginTop: 12, opacity: creando ? 0.7 : 1 }}
                onClick={crearPedidoParaLlevar}
                disabled={creando}
              >
                {creando ? "Creando..." : "Crear pedido y enviar mensaje de recibida"}
              </button>
            </div>
          </div>
        </div>

        {/* ===== Lista pedidos ===== */}
        <div style={{ marginTop: 18 }} />

        {loading ? (
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <p style={S.loaderText}>Cargando pedidos...</p>
          </div>
        ) : (
          <div className="parallevar-grid" style={S.layout}>
            {/* LISTA */}
            <div style={S.panel} className="panel">
              <div style={S.panelHeader}>
                <div>
                  <h3 style={S.panelTitle}>Pedidos</h3>
                  <p style={S.panelSub}>Enviado / Listo</p>
                </div>
              </div>

              {errMsg && (
                <div style={S.errorBox}>
                  <b>Error:</b> {errMsg}
                </div>
              )}

              <div style={S.ordersList}>
                {pedidos.map((p) => {
                  const selected = p.id === pedidoSeleccionadoId;
                  const c = estadoColor(p.estado);

                  return (
                    <button
                      key={p.id}
                      className="order-btn"
                      onClick={() => setPedidoSeleccionadoId(p.id)}
                      style={{
                        ...S.orderBtn,
                        borderColor: selected ? c : "rgba(255,255,255,0.08)",
                        boxShadow: selected ? `0 18px 30px ${c}22` : S.orderBtn.boxShadow,
                      }}
                    >
                      <div style={S.topRow}>
                        <div style={S.orderTitle}>Pedido #{p.id}</div>
                        <span
                          style={{
                            ...S.pill,
                            background: `${c}22`,
                            border: `1px solid ${c}33`,
                            color: c,
                          }}
                        >
                          {String(p.estado).toUpperCase()}
                        </span>
                      </div>

                      <div style={S.metaRow}>
                        <span style={S.metaText}>
                          {p.nombre_cliente ? `Cliente: ${p.nombre_cliente}` : "Cliente: —"}
                        </span>
                        <span style={S.metaText}>{p.telefono ? `Tel: +${p.telefono}` : "Tel: —"}</span>
                      </div>

                      <div style={S.metaRow}>
                        <span style={S.metaText}>{new Date(p.created_at).toLocaleString()}</span>
                      </div>

                      <span style={{ ...S.dot, background: c }} />
                    </button>
                  );
                })}

                {pedidos.length === 0 && (
                  <div style={S.emptyMini}>
                    <div style={S.emptyMiniIcon}>⬚</div>
                    <div style={S.emptyMiniText}>No hay pedidos para llevar</div>
                  </div>
                )}
              </div>
            </div>

            {/* DETALLE */}
            <div style={S.panel} className="panel">
              {!pedidoSeleccionado ? (
                <div style={S.emptyCard}>
                  <div style={S.emptyIcon}></div>
                  <h3 style={S.emptyTitle}>Sin selección</h3>
                  <p style={S.emptyText}>Selecciona un pedido para ver detalles.</p>
                </div>
              ) : (
                <div>
                  <div style={S.detailHeader}>
                    <div>
                      <div style={S.detailTitle}>
                        Pedido <span style={S.detailHash}>#{pedidoSeleccionado.id}</span>
                      </div>
                      <div style={S.detailSub}>
                        Para llevar • {new Date(pedidoSeleccionado.created_at).toLocaleString()}
                        {" • "}
                        Tel <b>{pedidoSeleccionado.telefono ? `+${pedidoSeleccionado.telefono}` : "—"}</b>
                      </div>
                    </div>

                    <span
                      style={{
                        ...S.statusBadge,
                        background: estadoColor(pedidoSeleccionado.estado),
                        boxShadow: `0 16px 28px ${estadoColor(pedidoSeleccionado.estado)}33`,
                      }}
                    >
                      {String(pedidoSeleccionado.estado).toUpperCase()}
                    </span>
                  </div>

                  <div style={S.divider} />

                  <div style={S.detailBox}>
                    {pedidoSeleccionado.detalle_pedidos?.length ? (
                      pedidoSeleccionado.detalle_pedidos.map((d) => {
                        const sub = d.cantidad * d.precio_unitario;
                        return (
                          <div key={d.id} style={S.itemRow} className="itemRow">
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={S.itemName}>
                                {d.platillos?.nombre || "Platillo"} <span style={S.itemQty}>× {d.cantidad}</span>
                              </div>
                              {d.platillos?.descripcion && <div style={S.itemDesc}>{d.platillos.descripcion}</div>}
                              {d.nota && <div style={S.itemNote}>Nota: {d.nota}</div>}
                            </div>

                            <div style={S.itemPrice}>
                              ${sub.toFixed(2)}
                              <div style={S.itemUnit}>${d.precio_unitario.toFixed(2)} c/u</div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={S.emptyInside}>Sin platillos registrados</div>
                    )}
                  </div>

                  <div style={S.actions}>
                    <div style={S.totalLine}>
                      Total:{" "}
                      <span style={S.totalPink}>
                        ${totalPedido(pedidoSeleccionado.detalle_pedidos || []).toFixed(2)}
                      </span>
                    </div>

                    {pedidoSeleccionado.estado === "Enviado" ? (
                      <button className="primaryBtn" style={S.btnPrimary} onClick={() => marcarListo(pedidoSeleccionado)}>
                        Marcar como listo y enviar mensaje
                      </button>
                    ) : (
                      <button style={S.btnDisabled} disabled>
                        Pedido listo
                      </button>
                    )}

                    <div style={S.whatsRow}>
                      <button
                        style={{ ...S.btnWhats, opacity: pedidoSeleccionado.telefono ? 1 : 0.5 }}
                        disabled={!pedidoSeleccionado.telefono}
                        onClick={() =>
                          abrirWhatsApp(
                            pedidoSeleccionado.telefono,
                            `Tu orden #${pedidoSeleccionado.id} ha sido recibida y está en preparación.`
                          )
                        }
                      >
                        WhatsApp: Recibida
                      </button>

                      <button
                        style={{ ...S.btnWhatsOk, opacity: pedidoSeleccionado.telefono ? 1 : 0.5 }}
                        disabled={!pedidoSeleccionado.telefono}
                        onClick={() =>
                          abrirWhatsApp(
                            pedidoSeleccionado.telefono,
                            `Tu orden #${pedidoSeleccionado.id} ya está terminada. Disponible en mostrador.`
                          )
                        }
                      >
                        WhatsApp: Lista
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL ALERTAS */}
      <AlertModal
        open={uiAlert.open}
        title={uiAlert.title}
        message={uiAlert.message}
        variant={uiAlert.variant}
        onClose={() => setUiAlert((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}

/** ===== CSS ===== */
const css = `
  .order-btn:hover { transform: translateY(-2px) scale(1.01); }
  .order-btn:active { transform: translateY(0px) scale(0.995); }
  .primaryBtn:hover { transform: translateY(-1px); opacity: .98; }
  .primaryBtn:active { transform: translateY(0px); opacity: .96; }
  .rowBtn:hover { background: rgba(255,255,255,0.03); }
  .itemRow:hover { background: rgba(255,255,255,0.03); }

  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 1020px){
    .parallevar-grid { grid-template-columns: 1fr !important; }
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
  wrap: { maxWidth: "100%", margin: "0 auto", padding: "28px 32px", minHeight: "calc(100vh - 120px)" },

  topTitle: { display: "flex", justifyContent: "center", marginBottom: 18 },
  topTitleText: {
    color: "#efefef",
    fontWeight: 900,
    fontSize: 22,
    letterSpacing: 0.2,
    textShadow: "0 10px 26px rgba(168,85,247,0.18)",
  },

  title: { fontSize: 28, fontWeight: 900, color: "#EAF0FF", margin: "8px 0 18px", textAlign: "center" },

  loadingWrap: { display: "grid", placeItems: "center", gap: 10, marginTop: 30 },
  spinner: {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "3px solid rgba(255,255,255,0.12)",
    borderTopColor: "#A855F7",
    animation: "spin 900ms linear infinite",
  },
  loaderText: { margin: 0, color: "rgba(226,232,240,0.75)", fontWeight: 700 },

  layout: { display: "grid", gridTemplateColumns: "710px 1fr", gap: 18, alignItems: "start" },

  panel: {
    background: "rgba(13, 21, 38, 0.72)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },

  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  panelTitle: { margin: 0, fontSize: 32, fontWeight: 900, color: "#EAF0FF" },
  panelSub: { margin: "6px 0 0", fontSize: 16, color: "rgba(226,232,240,0.65)", fontWeight: 800 },

  errorBox: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(180,35,24,0.18)",
    border: "1px solid rgba(180,35,24,0.35)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 900,
    marginTop: 10,
  },

  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 },
  label: { fontSize: 12, fontWeight: 900, color: "rgba(226,232,240,0.75)", marginBottom: 6 },

  input: {
    width: "100%",
    height: 46,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(10, 16, 32, 0.55)",
    color: "#EAF0FF",
    padding: "0 12px",
    outline: "none",
    fontWeight: 800,
  },

  phoneWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(10, 16, 32, 0.55)",
    padding: "0 10px",
    height: 46,
  },
  phonePrefix: {
    fontWeight: 1000 as any,
    color: "rgba(226,232,240,0.80)",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    paddingRight: 10,
  },
  phoneInput: {
    width: "100%",
    height: 44,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#EAF0FF",
    fontWeight: 800,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 800,
    color: "rgba(226,232,240,0.65)",
  },

  subPanel: {
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16,
    background: "rgba(10, 16, 32, 0.35)",
    overflow: "hidden",
  },
  subHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 12 },
  subTitle: { fontSize: 14, fontWeight: 1000 as any, color: "#EAF0FF" },
  totalMini: { fontSize: 12, fontWeight: 900, color: "rgba(226,232,240,0.75)" },

  list: { display: "grid", gap: 8, padding: 12, maxHeight: 420, overflowY: "auto" },

  rowBtn: {
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 12,
    background: "rgba(13, 21, 38, 0.55)",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    textAlign: "left",
  },
  rowName: {
    fontSize: 14,
    fontWeight: 1000 as any,
    color: "#EAF0FF",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowDesc: { marginTop: 6, fontSize: 12, color: "rgba(226,232,240,0.62)" },
  rowRight: { display: "grid", gap: 6, justifyItems: "end" },
  rowPrice: { fontWeight: 1000 as any, color: "#F472B6", whiteSpace: "nowrap" },
  rowAdd: { fontSize: 12, fontWeight: 1000 as any, color: "rgba(226,232,240,0.80)" },

  cartItem: {
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 12,
    background: "rgba(13, 21, 38, 0.55)",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
  },
  cartRight: { display: "grid", gap: 8, justifyItems: "end" },

qtyRow: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
},

qtyBtn: {
  width: 36,
  height: 36,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(10, 16, 32, 0.55)",
  color: "#EAF0FF",
  fontWeight: 1000 as any,
  fontSize: 18,
  lineHeight: 1,          // CLAVE
  padding: 0,             // CLAVE
  cursor: "pointer",
  userSelect: "none",
},

qtyNum: {
  minWidth: 26,
  height: 36,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 1000 as any,
  color: "#EAF0FF",
  lineHeight: 1,          // CLAVE
},


  removeBtn: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(180,35,24,0.18)",
    color: "#fff",
    padding: "8px 10px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 1000 as any,
  },

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

  ordersList: { display: "grid", gap: 14, marginTop: 18 },

  orderBtn: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 14,
    background: "rgba(10, 16, 32, 0.55)",
    cursor: "pointer",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    textAlign: "left",
    transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
    boxShadow: "0 12px 22px rgba(0,0,0,0.25)",
  },
  topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  orderTitle: { fontSize: 18, fontWeight: 1000 as any, color: "#FFFFFF", lineHeight: 1 },
  metaRow: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  metaText: { fontSize: 12, fontWeight: 800, color: "rgba(226,232,240,0.75)" },
  pill: { fontSize: 11, fontWeight: 1000 as any, padding: "6px 10px", borderRadius: 999, letterSpacing: 0.4 },
  dot: { position: "absolute", top: 12, left: 12, width: 10, height: 10, borderRadius: 99 },

  emptyMini: {
    padding: 14,
    borderRadius: 16,
    background: "rgba(10, 16, 32, 0.35)",
    border: "1px dashed rgba(255,255,255,0.10)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
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
    gap: 30,
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

  detailHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  detailTitle: { fontSize: 20, fontWeight: 1000 as any, color: "#EAF0FF" },
  detailHash: { color: "#A855F7" },
  detailSub: { marginTop: 6, fontSize: 12, color: "rgba(226,232,240,0.65)", fontWeight: 700 },
  statusBadge: { padding: "8px 12px", borderRadius: 12, color: "#0B1220", fontWeight: 1000 as any, fontSize: 12, letterSpacing: 0.6 },
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

  actions: { marginTop: 14, display: "grid", gap: 12 },
  totalLine: { fontWeight: 1000 as any, color: "rgba(226,232,240,0.85)" },
  totalPink: { color: "#F472B6" },

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

  whatsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },

  btnWhats: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: "14px 16px",
    background: "#1f6feb",
    color: "#fff",
    fontWeight: 1000 as any,
    fontSize: 14,
    cursor: "pointer",
    transition: "transform 120ms ease, opacity 120ms ease",
  },
  btnWhatsOk: {
    width: "100%",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    padding: "14px 16px",
    background: "#1a7f37",
    color: "#fff",
    fontWeight: 1000 as any,
    fontSize: 14,
    cursor: "pointer",
    transition: "transform 120ms ease, opacity 120ms ease",
  },
};
