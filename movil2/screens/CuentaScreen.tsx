import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { supabase } from "../supabase/supabaseClient";
import { COLORS } from "../styles/theme";

export default function CuentaScreen({ route, navigation }: any) {
  const { mesa } = route.params;
  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (mesa?.id) {
      fetchPedido();
      activarTiempoReal();
    }

    return () => {
      supabase.removeAllChannels();
    };
  }, [mesa]);

  // 🔹 Cargar pedido actual
  const fetchPedido = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, detalle_pedidos(id, cantidad, precio_unitario, platillos(nombre))")
        .eq("id", mesa.id)
        .maybeSingle();

      if (error) console.log("❌ Error cargando pedido:", error.message);
      else setPedido(data);
    } catch (err: any) {
      console.log("❌ Error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🔹 Tiempo real
  const activarTiempoReal = async () => {
    const canalPedidos = supabase
      .channel("pedido_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos", filter: `id=eq.${mesa.id}` },
        async () => await fetchPedido()
      )
      .subscribe();

    const canalDetalles = supabase
      .channel("detalle_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "detalle_pedidos" },
        async () => await fetchPedido()
      )
      .subscribe();

    console.log("👂 Suscripción activa a pedido y detalles");
  };

  // 🔹 Refresco manual al jalar hacia abajo (misma lógica que HomeScreen)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPedido();
    setRefreshing(false);
  }, []);

  // 💸 Pedir permiso de cobro
  const pedirCobro = async () => {
    if (pedido.estado !== "Listo") {
      Alert.alert("⚠️ No disponible", "Solo puedes pedir cobro cuando el pedido esté listo.");
      return;
    }

    const { error } = await supabase
      .from("pedidos")
      .update({ estado: "Pendiente de cobro" })
      .eq("id", pedido.id);

    if (error) {
      Alert.alert("❌ Error", "No se pudo pedir el cobro.");
      console.log(error);
    } else {
      Alert.alert("💸 Pedido enviado a caja", "El cajero verá el pedido en su lista.");
    }
  };

  // ✅ Finalizar cuenta
  const finalizarCuenta = async () => {
    if (pedido.estado !== "Entregado") {
      Alert.alert("⏳ Espera", "Caja aún no ha confirmado el cobro.");
      return;
    }

    const { error } = await supabase
      .from("pedidos")
      .update({ estado: "Completada" })
      .eq("id", pedido.id);

    if (error) {
      Alert.alert("❌ Error", "No se pudo finalizar la cuenta.");
      console.log(error);
    } else {
      Alert.alert("✅ Cuenta finalizada", "Pedido cerrado correctamente.");
      navigation.navigate("HomeScreen");
    }
  };

  // 🧾 Generar PDF local
  const generarTicketPDF = async () => {
    try {
      const total = pedido.detalle_pedidos?.reduce(
        (acc: number, d: any) => acc + d.cantidad * d.precio_unitario,
        0
      );

      const html = `
        <html>
          <body style="font-family:sans-serif; text-align:center;">
            <h2>🍽 Restaurante Villa Duarte</h2>
            <p><b>Pedido #${pedido.id}</b> — Mesa ${pedido.numero_mesa}</p>
            <hr/>
            ${pedido.detalle_pedidos
              .map(
                (d: any) =>
                  `<p>${d.platillos?.nombre} ×${d.cantidad} — $${(
                    d.precio_unitario * d.cantidad
                  ).toFixed(2)}</p>`
              )
              .join("")}
            <hr/>
            <h3>Total: $${total?.toFixed(2)}</h3>
            <p>¡Gracias por su visita!</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (err) {
      console.log("❌ Error generando ticket PDF:", err);
      Alert.alert("Error", "No se pudo generar el ticket.");
    }
  };

  if (loading || !pedido)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.textGray }}>Cargando cuenta...</Text>
      </View>
    );

  const total = pedido.detalle_pedidos?.reduce(
    (acc: number, d: any) => acc + d.cantidad * d.precio_unitario,
    0
  );

  return (
    <View style={styles.main}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <Text style={styles.title}>🧾 Cuenta de Mesa {pedido.numero_mesa}</Text>

        <View style={styles.detalleBox}>
          {pedido.detalle_pedidos?.map((d: any) => (
            <View key={d.id} style={styles.row}>
              <Text style={styles.platillo}>
                {d.platillos?.nombre} ×{d.cantidad}
              </Text>
              <Text style={styles.precio}>${(d.precio_unitario * d.cantidad).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.total}>💰 Total: ${total?.toFixed(2)}</Text>

        {pedido.estado === "Listo" && (
          <TouchableOpacity style={styles.btnCobro} onPress={pedirCobro}>
            <Text style={styles.btnText}>💸 Pedir permiso de cobro</Text>
          </TouchableOpacity>
        )}

        {pedido.estado === "Pendiente de cobro" && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>💳 Esperando confirmación de caja...</Text>
          </View>
        )}

        {pedido.estado === "Entregado" && (
          <>
            <TouchableOpacity style={styles.btnTicket} onPress={generarTicketPDF}>
              <Text style={styles.btnText}>🧾 Generar Ticket PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnFinalizar} onPress={finalizarCuenta}>
              <Text style={styles.btnText}>✅ Finalizar Cuenta</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* === ESTILOS === */
const styles = StyleSheet.create({
  main: { flex: 1, backgroundColor: COLORS.bgLight },
  scrollContainer: { padding: 20, alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.textDark, marginBottom: 20 },
  detalleBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    width: "100%",
    marginBottom: 20,
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  platillo: { fontSize: 16, color: COLORS.textDark },
  precio: { fontSize: 16, fontWeight: "700", color: COLORS.primary },
  total: { fontSize: 18, fontWeight: "700", textAlign: "right", marginBottom: 20, width: "100%" },
  btnCobro: { backgroundColor: COLORS.accent, padding: 16, borderRadius: 10, marginBottom: 10 },
  btnTicket: { backgroundColor: COLORS.warn, padding: 16, borderRadius: 10, marginTop: 10 },
  btnFinalizar: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 10, marginTop: 10 },
  btnText: { textAlign: "center", color: "#fff", fontWeight: "800", fontSize: 16 },
  alertBox: {
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FBBF24",
    width: "100%",
  },
  alertText: { color: "#92400E", fontWeight: "600", textAlign: "center" },
});
