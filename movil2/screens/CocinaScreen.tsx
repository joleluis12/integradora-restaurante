import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../supabase/supabaseClient";
import { COLORS } from "../styles/theme";

export default function CocinaScreen({ navigation }: any) {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  //  SOLO UI: 10 mesas + selección
  const MESAS = useMemo(() => Array.from({ length: 10 }, (_, i) => i + 1), []);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<number>(1);

  useEffect(() => {
    fetchPedidos();

    const channel = supabase
      .channel("realtime-pedidos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        (payload: any) => {
          if (payload?.new?.estado === "listo") {
            Alert.alert(
              " Pedido listo",
              `Pedido #${payload.new.id} está listo para entregar`
            );
          }
          fetchPedidos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPedidos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pedidos")
      .select(`
        id,
        numero_mesa,
        estado,
        created_at,
        detalle_pedidos:detalle_pedidos_pedido_id_fkey (
          id,
          cantidad,
          precio_unitario,
          nota,
          platillos:platillo_id (nombre)
        )
      `)
      .order("id", { ascending: false });

    if (!error) setPedidos(data || []);
    setLoading(false);
  };

  //  SOLO UI: “último pedido por mesa” para pintar la mesa
  const ultimoPedidoPorMesa = useMemo(() => {
    const map = new Map<number, any>();
    for (const p of pedidos) {
      if (!map.has(p.numero_mesa)) map.set(p.numero_mesa, p);
    }
    return map;
  }, [pedidos]);

  const colorEstado = (estado?: string) => {
    if (!estado) return "#CBD5E1"; // libre
    return estado === "pendiente"
      ? "#F59E0B"
      : estado === "listo"
      ? "#10B981"
      : "#3B82F6";
  };

  //  SOLO UI: filtrar lista por mesa seleccionada
  const pedidosMesa = useMemo(() => {
    return pedidos.filter((p) => p.numero_mesa === mesaSeleccionada);
  }, [pedidos, mesaSeleccionada]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}> Pedidos activos</Text>

      {/*  MESAS (10) */}
      <View style={styles.mesasBox}>
        <Text style={styles.mesasTitle}>Mesas</Text>

        <View style={styles.mesasGrid}>
          {MESAS.map((m) => {
            const p = ultimoPedidoPorMesa.get(m);
            const estado = p?.estado;
            const selected = mesaSeleccionada === m;

            return (
              <TouchableOpacity
                key={m}
                activeOpacity={0.85}
                onPress={() => setMesaSeleccionada(m)}
                style={[
                  styles.mesaBtn,
                  {
                    borderColor: selected ? COLORS.primary : "rgba(0,0,0,0.12)",
                    backgroundColor: selected ? "rgba(16,185,129,0.10)" : "#fff",
                  },
                ]}
              >
                <Text style={styles.mesaNum}>{m}</Text>

                <View
                  style={[
                    styles.badge,
                    {
                      borderColor: colorEstado(estado),
                      backgroundColor: colorEstado(estado) + "22",
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: colorEstado(estado) }]}>
                    {p ? String(estado).toUpperCase() : "LIBRE"}
                  </Text>
                </View>

                {p ? (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colorEstado(estado) },
                    ]}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/*  LISTA (tu FlatList, pero por mesa) */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={pedidosMesa} // <- si quieres TODOS los pedidos, cambia a: pedidos
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay pedidos en la mesa {mesaSeleccionada}.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.pedido}> Pedido #{item.id}</Text>
              <Text style={styles.mesa}>Mesa: {item.numero_mesa}</Text>
              <Text style={styles.estado}>
                Estado:{" "}
                <Text
                  style={{
                    color: colorEstado(item.estado),
                    fontWeight: "700",
                  }}
                >
                  {item.estado}
                </Text>
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },

  title: { fontSize: 22, fontWeight: "900", marginVertical: 12 },

  mesasBox: {
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    marginBottom: 12,
  },
  mesasTitle: { fontSize: 14, fontWeight: "900", marginBottom: 10, color: "#111" },

  mesasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10 as any, // RN ignora en algunas versiones, pero no afecta
  },

  mesaBtn: {
    width: "48%",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 2,
    position: "relative",
  },
  mesaNum: { fontSize: 26, fontWeight: "900", color: "#111" },

  badge: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: "900" },

  dot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 10,
  },

  card: {
    backgroundColor: "#FAFAFA",
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pedido: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  mesa: { fontSize: 16, color: "#333", marginBottom: 4 },
  estado: { fontSize: 15, marginBottom: 8 },

  empty: { textAlign: "center", color: "#666", marginTop: 10, fontWeight: "700" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});