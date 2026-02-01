import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from "react-native";
import { supabase } from "../supabase/supabaseClient";
import { COLORS } from "../styles/theme";

export default function MenuScreen({ navigation, route }: any) {
  const [platillos, setPlatillos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [nota, setNota] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [platilloSeleccionado, setPlatilloSeleccionado] = useState<any>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const mesa = route?.params?.mesa;

  useEffect(() => {
    fetchPlatillos();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const fetchPlatillos = async () => {
    const { data, error } = await supabase.from("platillos").select("*");
    if (!error) setPlatillos(data || []);
    setLoading(false);
  };

  const animarBoton = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 8 }),
    ]).start();
  };

  const abrirModalNota = (item: any) => {
    setPlatilloSeleccionado(item);
    setNota("");
    setCantidad(1);
    setModalVisible(true);
  };

  // ✅ Insertar platillo con nota y cantidad
  const confirmarAgregar = async () => {
    if (!mesa) return Alert.alert("⚠️ Error", "No hay una mesa activa.");

    if (platilloSeleccionado) {
      const subtotal = platilloSeleccionado.precio * cantidad;

      const detalle = {
        pedido_id: mesa.id,
        platillo_id: platilloSeleccionado.id,
        cantidad,
        precio_unitario: platilloSeleccionado.precio,
        subtotal,
        nota: nota || "",
      };

      const { error } = await supabase.from("detalle_pedidos").insert(detalle);

      if (error) {
        console.log("❌ Error insertando detalle:", error.message);
        Alert.alert("Error", "No se pudo agregar el platillo al pedido");
      } else {
        Alert.alert(
          "✅ Agregado",
          `${cantidad} × ${platilloSeleccionado.nombre} añadido al pedido`
        );
      }
    }

    setModalVisible(false);
  };

  // ✅ Enviar pedido → Cocina + volver al Home
  const enviarPedido = async () => {
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ estado: "Enviado" })
        .eq("id", mesa.id);

      if (error) {
        console.log("❌ Error al enviar pedido:", error.message);
        return Alert.alert("Error", "No se pudo enviar el pedido");
      }

      Alert.alert("✅ Pedido enviado a cocina", "Tu pedido fue enviado correctamente.", [
        { text: "OK", onPress: () => navigation.navigate("HomeScreen") }, // 👈 vuelve al Home
      ]);
    } catch (err: any) {
      console.log("❌ Error general:", err.message);
      Alert.alert("Error", "Ocurrió un problema al enviar el pedido");
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando menú...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>🍽️ Menú</Text>
        <Text style={styles.subtitle}>
          Mesa {mesa?.numero_mesa || "—"} | {platillos.length} platillos
        </Text>
      </View>

      {/* LISTA DE PLATILLOS */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          data={platillos}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.imagen_url ? (
                <Image source={{ uri: item.imagen_url }} style={styles.image} />
              ) : (
                <View style={styles.noImage}>
                  <Text style={{ fontSize: 40 }}>🍽️</Text>
                  <Text style={{ color: "#777" }}>Sin imagen</Text>
                </View>
              )}

              <View style={styles.info}>
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.desc}>
                  {item.descripcion || "Platillo especial del día"}
                </Text>
                <View style={styles.row}>
                  <Text style={styles.precio}>${item.precio}</Text>
                  <Animated.View style={{ transform: [{ scale }] }}>
                    <TouchableOpacity
                      style={styles.btn}
                      onPress={() => {
                        animarBoton();
                        abrirModalNota(item);
                      }}
                    >
                      <Text style={styles.btnText}>+ Agregar</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            </View>
          )}
        />
      </Animated.View>

      {/* BOTÓN ENVIAR */}
      <TouchableOpacity style={styles.btnEnviar} onPress={enviarPedido}>
        <Text style={styles.btnEnviarText}>Enviar Pedido</Text>
      </TouchableOpacity>

      {/* MODAL DE NOTA Y CANTIDAD */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>📝 {platilloSeleccionado?.nombre}</Text>

                {/* Cantidad */}
                <View style={styles.cantidadContainer}>
                  <TouchableOpacity
                    style={styles.cantidadBtn}
                    onPress={() => setCantidad(Math.max(1, cantidad - 1))}
                  >
                    <Text style={styles.cantidadTexto}>−</Text>
                  </TouchableOpacity>

                  <Text style={styles.cantidadNumero}>{cantidad}</Text>

                  <TouchableOpacity
                    style={styles.cantidadBtn}
                    onPress={() => setCantidad(cantidad + 1)}
                  >
                    <Text style={styles.cantidadTexto}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Nota */}
                <TextInput
                  style={styles.input}
                  placeholder="Instrucciones especiales..."
                  placeholderTextColor="#999"
                  value={nota}
                  onChangeText={setNota}
                  multiline
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: COLORS.bgLight }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={{ color: COLORS.textDark, fontWeight: "700" }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: COLORS.primary }]}
                    onPress={confirmarAgregar}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

/* === ESTILOS === */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  header: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.textDark },
  subtitle: { fontSize: 15, color: COLORS.textGray, marginTop: 4 },
  listContent: { padding: 16 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
    }),
  },
  image: { width: "100%", height: 180 },
  noImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  info: { padding: 16 },
  nombre: { fontSize: 20, fontWeight: "700", color: COLORS.textDark },
  desc: { color: COLORS.textGray, marginTop: 4, fontSize: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  precio: { fontSize: 20, fontWeight: "800", color: COLORS.accent },
  btn: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "800" },
  btnEnviar: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
  },
  btnEnviarText: { textAlign: "center", color: "#fff", fontWeight: "800", fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center" },
  modalContent: { backgroundColor: "#fff", borderRadius: 20, padding: 20, width: "85%" },
  modalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 10, color: COLORS.textDark },
  cantidadContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  cantidadBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cantidadTexto: { fontSize: 20, fontWeight: "800", color: "#fff" },
  cantidadNumero: { fontSize: 22, fontWeight: "700", marginHorizontal: 15, color: COLORS.textDark },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 10, minHeight: 80, color: COLORS.textDark },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  modalBtn: { flex: 1, alignItems: "center", padding: 14, marginHorizontal: 5, borderRadius: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: COLORS.textGray, marginTop: 10 },
});
