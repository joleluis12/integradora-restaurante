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
  Pressable,
} from "react-native";
import { supabase } from "../supabase/supabaseClient";
import { COLORS } from "../styles/theme";
import { LinearGradient } from "expo-linear-gradient";

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

  // =========================
  //  GLASS ALERT (tipo imagen)
  // =========================
  const [gaVisible, setGaVisible] = useState(false);
  const [gaTitle, setGaTitle] = useState("");
  const [gaMsg, setGaMsg] = useState("");
  const [gaOnClose, setGaOnClose] = useState<null | (() => void)>(null);

  const showAlert = (title: string, message?: string, onClose?: () => void) => {
    setGaTitle(title);
    setGaMsg(message || "");
    setGaOnClose(() => onClose || null);
    setGaVisible(true);
  };

  const closeAlert = () => {
    setGaVisible(false);
    const cb = gaOnClose;
    setGaOnClose(null);
    if (cb) cb();
  };

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

  //  Insertar platillo con nota y cantidad
  const confirmarAgregar = async () => {
    if (!mesa) return showAlert("Error", "No hay una mesa activa.");

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
        console.log(" Error insertando detalle:", error.message);
        showAlert("Error", "No se pudo agregar el platillo al pedido");
      } else {
        showAlert("Pedido actualizado", `${cantidad} × ${platilloSeleccionado.nombre} añadido al pedido`);
      }
    }

    setModalVisible(false);
  };

  //  Enviar pedido → Cocina + volver al Home
  const enviarPedido = async () => {
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({ estado: "Enviado" })
        .eq("id", mesa.id);

      if (error) {
        console.log(" Error al enviar pedido:", error.message);
        return showAlert("Error", "No se pudo enviar el pedido");
      }

      showAlert("Pedido enviado", "Tu pedido fue enviado correctamente.", () =>
        navigation.navigate("HomeScreen")
      );
    } catch (err: any) {
      console.log(" Error general:", err.message);
      showAlert("Error", "Ocurrió un problema al enviar el pedido");
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
        <Text style={styles.title}> Menú</Text>
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
                  <Text style={{ fontSize: 40 }}></Text>
                  <Text style={{ color: "#777" }}>Sin imagen</Text>
                </View>
              )}

              <View style={styles.info}>
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.desc}>{item.descripcion || "Platillo especial del día"}</Text>
                <View style={styles.row}>
                  <Text style={styles.precio}>${item.precio}</Text>
                  <Animated.View style={{ transform: [{ scale }] }}>
                    <TouchableOpacity
                      style={styles.btn}
                      onPress={() => {
                        animarBoton();
                        abrirModalNota(item);
                      }}
                      activeOpacity={0.9}
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
      <TouchableOpacity style={styles.btnEnviar} onPress={enviarPedido} activeOpacity={0.9}>
        <Text style={styles.btnEnviarText}>Enviar Pedido</Text>
      </TouchableOpacity>

      {/*  MODAL DE NOTA Y CANTIDAD (MEJORADO) */}
      <Modal visible={modalVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 18,
              }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContentNew}>
                <View style={styles.modalTopRow}>
                  <View style={styles.modalIcon}>
                    <Text style={styles.modalIconText}></Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitleNew} numberOfLines={2}>
                      {platilloSeleccionado?.nombre || "Platillo"}
                    </Text>
                    <Text style={styles.modalSubNew}>Agrega cantidad y nota (opcional)</Text>
                  </View>
                </View>

                {/* Cantidad */}
                <View style={styles.qtyWrap}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => setCantidad(Math.max(1, cantidad - 1))}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>

                  <View style={styles.qtyPill}>
                    <Text style={styles.qtyNumber}>{cantidad}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => setCantidad(cantidad + 1)}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Nota */}
                <View style={styles.noteWrap}>
                  <TextInput
                    style={styles.inputNew}
                    placeholder="Instrucciones especiales..."
                    placeholderTextColor="#9CA3AF"
                    value={nota}
                    onChangeText={setNota}
                    multiline
                  />
                </View>

                {/* Botones (SIN ENCIMARSE) */}
                <View style={styles.modalButtonsNew}>
                  <TouchableOpacity
                    style={styles.btnCancelNew}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.btnCancelTextNew}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={confirmarAgregar} activeOpacity={0.9} style={{ flex: 1 }}>
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.btnAddNew}
                    >
                      <Text style={styles.btnAddTextNew}>Agregar</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/*  GLASS ALERT */}
      <GlassAlert
        visible={gaVisible}
        title={gaTitle}
        message={gaMsg}
        buttonText="Aceptar"
        onClose={closeAlert}
      />
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

  // ===== Modal overlay =====
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.50)",
    justifyContent: "center",
    alignItems: "center",
  },

  //  Modal NUEVO (más grande y bonito)
  modalContentNew: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#fff",
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
    }),
  },

  modalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(124,58,237,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.20)",
  },
  modalIconText: { fontSize: 20 },
  modalTitleNew: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textDark,
    lineHeight: 26,
  },
  modalSubNew: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textGray,
  },

  qtyWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 10,
    marginBottom: 12,
  },
  qtyBtn: {
    width: 56,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
  },
  qtyBtnText: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.accent,
    marginTop: -2,
  },
  qtyPill: {
    minWidth: 86,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  qtyNumber: { fontSize: 20, fontWeight: "900", color: COLORS.textDark },

  noteWrap: { marginTop: 2 },
  inputNew: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    padding: 14,
    minHeight: 110,
    textAlignVertical: "top",
    color: COLORS.textDark,
    backgroundColor: "#FAFAFA",
  },

  modalButtonsNew: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  btnCancelNew: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  btnCancelTextNew: { color: COLORS.textDark, fontWeight: "900", fontSize: 16 },

  btnAddNew: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnAddTextNew: { color: "#fff", fontWeight: "900", fontSize: 16 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: COLORS.textGray, marginTop: 10 },
});

/* =========================================================
    COMPONENTE EMBEBIDO - GLASS ALERT
   ========================================================= */
type GlassAlertProps = {
  visible: boolean;
  title: string;
  message?: string;
  buttonText?: string;
  onClose: () => void;
};

function GlassAlert({ visible, title, message, buttonText = "Aceptar", onClose }: GlassAlertProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      scale.setValue(0.92);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.96, duration: 120, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={ga.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />

        <Animated.View style={[ga.cardWrap, { opacity, transform: [{ scale }] }]}>
          <LinearGradient
            colors={[
              "rgba(76,29,149,0.88)",
              "rgba(88,28,135,0.82)",
              "rgba(124,58,237,0.62)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={ga.card}
          >
            <Text style={ga.title}>{title}</Text>

            {!!message && <Text style={ga.message}>{message}</Text>}

            <TouchableOpacity activeOpacity={0.9} onPress={close} style={ga.btnWrap}>
              <LinearGradient
                colors={["rgba(124,58,237,0.95)", "rgba(88,28,135,0.95)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ga.btn}
              >
                <Text style={ga.btnText}>{buttonText}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const ga = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  cardWrap: { width: "100%", maxWidth: 420 },
  card: {
    borderRadius: 28,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  title: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  message: {
    marginTop: 10,
    textAlign: "center",
    color: "rgba(255,255,255,0.92)",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 26,
  },
  btnWrap: { marginTop: 18, alignItems: "center" },
  btn: {
    width: "78%",
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  btnText: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
});