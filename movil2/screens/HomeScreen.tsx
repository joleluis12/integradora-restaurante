import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  RefreshControl,
  Animated,
  KeyboardAvoidingView,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../supabase/supabaseClient";
import { COLORS, FONTS, CARD } from "../styles/theme";

type Estado = "Inconclusa" | "Enviado" | "Entregado";
type Filtro = "Todas" | Estado;

export default function HomeScreen({ navigation, user }: any) {
  const [mesas, setMesas] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [numeroMesa, setNumeroMesa] = useState("");
  const [ocupantes, setOcupantes] = useState("");
  const [nota, setNota] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [filtro, setFiltro] = useState<Filtro>("Todas");
  const [q, setQ] = useState("");

  // Anim base
  const listFade = useRef(new Animated.Value(0)).current;
  const listTranslate = useRef(new Animated.Value(8)).current;

  const fabScale = useRef(new Animated.Value(1)).current;
  const fabRotate = useRef(new Animated.Value(0)).current;

  const logoutScale = useRef(new Animated.Value(1)).current;

  // Focus search
  const searchFocus = useRef(new Animated.Value(0)).current;

  // Modal anim
  const modalScale = useRef(new Animated.Value(0.92)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const [focusField, setFocusField] = useState<"mesa" | "ocupantes" | "nota" | null>(null);

  // Ribbons animadas del panel
  const ribbon1 = useRef(new Animated.Value(0)).current;
  const ribbon2 = useRef(new Animated.Value(0)).current;
  const ribbon3 = useRef(new Animated.Value(0)).current;

  // ========= Helpers anim =========
  const pressIn = (v: Animated.Value, to = 0.97) =>
    Animated.spring(v, {
      toValue: to,
      useNativeDriver: true,
      friction: 6,
      tension: 180,
    }).start();

  const pressOut = (v: Animated.Value) =>
    Animated.spring(v, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 180,
    }).start();

  useEffect(() => {
    if (user?.id) {
      void fetchMesas();
      activarTiempoReal();
    }
    return () => {
      void supabase.removeAllChannels();
    };
  }, [user?.id]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(listFade, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(listTranslate, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [mesas.length, filtro, q]);

  useEffect(() => {
    const loop = (v: Animated.Value, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 6500, delay, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();

    loop(ribbon1, 0);
    loop(ribbon2, 800);
    loop(ribbon3, 1600);
  }, []);

  // Modal open animation
  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.timing(modalOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(modalScale, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }),
      ]).start();
    } else {
      modalScale.setValue(0.92);
      modalOpacity.setValue(0);
      setFocusField(null);
    }
  }, [modalVisible]);

  // Data
  const fetchMesas = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, detalle_pedidos( id, cantidad, nota, platillos(nombre, precio) )")
        .eq("id_mesero", user.id)
        .neq("estado", "Completada")
        .order("created_at", { ascending: false });

      if (error) console.log(" Error cargando mesas:", error.message);
      else setMesas(data || []);
    } catch (err: any) {
      console.log(" Error:", err.message);
    }
  };

  // realtime
  const activarTiempoReal = () => {
    supabase
      .channel("pedidos_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, () => {
        void fetchMesas();
      })
      .subscribe();

    supabase
      .channel("detalle_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "detalle_pedidos" }, () => {
        void fetchMesas();
      })
      .subscribe();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMesas();
    setRefreshing(false);
  }, []);

  const agregarMesa = async () => {
    if (!numeroMesa) return Alert.alert(" Ingresa el número de mesa");
    try {
      const { error } = await supabase.from("pedidos").insert([
        {
          id_mesero: user.id,
          numero_mesa: Number(numeroMesa),
          ocupantes: Number(ocupantes) || null,
          nota,
          estado: "Inconclusa",
          fecha: new Date().toISOString(),
          total: 0,
        },
      ]);

      if (error) {
        console.log(" Error al agregar mesa:", error.message);
        Alert.alert("Error", "No se pudo agregar la mesa");
      } else {
        setModalVisible(false);
        setNumeroMesa("");
        setOcupantes("");
        setNota("");
      }
    } catch (err: any) {
      console.log(" Error:", err.message);
      Alert.alert("Error", err.message);
    }
  };

  const estadoColors = (estado: Estado | string) => {
    switch (estado) {
      case "Enviado":
        return { stripe: COLORS.accent, chipBg: "rgba(59,130,246,0.12)", chip: COLORS.accent };
      case "Inconclusa":
        return { stripe: COLORS.warn, chipBg: "rgba(245,158,11,0.15)", chip: COLORS.warn };
      case "Entregado":
        return { stripe: COLORS.primary, chipBg: "rgba(16,185,129,0.14)", chip: COLORS.primary };
      default:
        return { stripe: COLORS.textGray, chipBg: COLORS.bgLight, chip: COLORS.textDark };
    }
  };

  const filtrar = (items: any[]) => {
    let out = items;
    if (filtro !== "Todas") out = out.filter((x) => x.estado === filtro);
    if (q.trim()) {
      const query = q.trim().toLowerCase();
      out = out.filter((x) => {
        const mesaTxt = `mesa ${x.numero_mesa}`.toLowerCase();
        const notaTxt = (x.nota || "").toLowerCase();
        const nombres = (x.detalle_pedidos || [])
          .map((p: any) => p?.platillos?.nombre || "")
          .join(" ")
          .toLowerCase();
        return mesaTxt.includes(query) || notaTxt.includes(query) || nombres.includes(query);
      });
    }
    return out;
  };

  const dataFiltrada = filtrar(mesas);

  // métricas panel
  const totalTodas = mesas.length;
  const totalInconclusa = mesas.filter((m) => m.estado === "Inconclusa").length;
  const totalEnviado = mesas.filter((m) => m.estado === "Enviado").length;
  const totalEntregado = mesas.filter((m) => m.estado === "Entregado").length;

  // ====== Stat Card (solo UI) ======
  const StatCard = ({ label, value, icon }: { label: string; value: number; icon: any }) => {
    const s = useRef(new Animated.Value(1)).current;
    return (
      <Animated.View style={[styles.statCard, { transform: [{ scale: s }] }]}>
        <TouchableOpacity
          activeOpacity={0.95}
          onPressIn={() => pressIn(s, 0.98)}
          onPressOut={() => pressOut(s)}
          style={{ width: "100%" }}
        >
          <View style={styles.statTopRow}>
            <View style={styles.statIconWrap}>
              <MaterialCommunityIcons name={icon} size={16} color={COLORS.white} />
            </View>
            <Text style={styles.statLabel} numberOfLines={1}>
              {label}
            </Text>
          </View>
          <Text style={styles.statValue}>{value}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // === Card con animación press ===
  const MesaCard = memo(({ item }: { item: any }) => {
    const { chipBg, chip, stripe } = estadoColors(item.estado as Estado);

    const totalMesa =
      item?.detalle_pedidos?.reduce(
        (acc: number, p: any) => acc + (Number(p?.platillos?.precio) || 0) * (Number(p?.cantidad) || 0),
        0
      ) || 0;

    const cardScale = useRef(new Animated.Value(1)).current;
    const menuScale = useRef(new Animated.Value(1)).current;
    const cuentaScale = useRef(new Animated.Value(1)).current;

    return (
      <Animated.View style={[styles.cardWrap, { transform: [{ scale: cardScale }] }]}>
        <View style={[styles.stripe, { backgroundColor: stripe }]} />

        <TouchableOpacity
          activeOpacity={1}
          onPressIn={() => pressIn(cardScale, 0.985)}
          onPressOut={() => pressOut(cardScale)}
          style={{ marginHorizontal: 8 }}
        >
          <View style={[styles.card, CARD]}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={[FONTS.subtitle, styles.mesaTitle]}>Mesa {item.numero_mesa}</Text>
                <Text style={[FONTS.small, styles.subText]}>Ocupantes: {item.ocupantes || "—"}</Text>
              </View>

              <View style={[styles.chip, { backgroundColor: chipBg }]}>
                <Text style={[styles.chipText, { color: chip }]}>{item.estado}</Text>
              </View>
            </View>

            {item.detalle_pedidos?.length > 0 ? (
              <View style={[styles.pedidosBox, { backgroundColor: COLORS.bgLight, borderColor: COLORS.bgLight }]}>
                {item.detalle_pedidos.map((p: any) => (
                  <View key={p.id} style={styles.platilloRow}>
                    <Text style={[FONTS.body, styles.platilloNombre]}>
                      {p.platillos?.nombre || "Platillo"} ×{p.cantidad}
                    </Text>
                    <Text style={[FONTS.subtitle, styles.platilloPrecio]}>
                      ${((p.platillos?.precio || 0) * p.cantidad).toFixed(2)}
                    </Text>
                  </View>
                ))}

                <View style={styles.totalRow}>
                  <Text style={[FONTS.small, styles.totalLabel]}>Total estimado</Text>
                  <Text style={[FONTS.subtitle, styles.totalValue]}>${totalMesa.toFixed(2)}</Text>
                </View>
              </View>
            ) : (
              <Text style={[FONTS.small, styles.sinPedidos]}>Sin pedidos aún</Text>
            )}

            <View style={styles.buttons}>
              <Animated.View style={{ flex: 1, transform: [{ scale: menuScale }] }}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnOutline]}
                  onPress={() => navigation.navigate("MenuScreen", { mesa: item })}
                  onPressIn={() => pressIn(menuScale, 0.97)}
                  onPressOut={() => pressOut(menuScale)}
                  activeOpacity={0.95}
                >
                  <Text style={[FONTS.subtitle, styles.btnTextOutline]}>Menú</Text>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={{ flex: 1, transform: [{ scale: cuentaScale }] }}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSolid]}
                  onPress={() => navigation.navigate("CuentaScreen", { mesa: item })}
                  onPressIn={() => pressIn(cuentaScale, 0.97)}
                  onPressOut={() => pressOut(cuentaScale)}
                  activeOpacity={0.95}
                >
                  <Text style={[FONTS.subtitle, styles.btnTextSolid]}>Cuenta</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  });

  // FAB anim
  const pressFab = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(fabScale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
        Animated.spring(fabScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(fabRotate, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(fabRotate, { toValue: 0, duration: 140, useNativeDriver: true }),
      ]),
    ]).start(() => setModalVisible(true));
  };

  const fabRot = fabRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "12deg"],
  });

  // filtro chip anim
  const FiltroChip = ({ label }: { label: Filtro }) => {
    const active = filtro === label;
    const s = useRef(new Animated.Value(1)).current;

    const doPress = () => {
      Animated.sequence([
        Animated.timing(s, { toValue: 0.96, duration: 80, useNativeDriver: true }),
        Animated.spring(s, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();

      setFiltro(active ? "Todas" : label);
    };

    return (
      <Animated.View style={{ transform: [{ scale: s }] }}>
        <TouchableOpacity
          onPress={doPress}
          activeOpacity={0.9}
          style={[
            styles.filterChip,
            active
              ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
              : { backgroundColor: COLORS.white, borderColor: COLORS.accent },
          ]}
        >
          <Text style={[styles.filterChipText, { color: active ? COLORS.white : COLORS.accent }]}>{label}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // reloj
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const onLogout = async () => {
    pressIn(logoutScale, 0.96);
    setTimeout(() => pressOut(logoutScale), 90);
    await supabase.auth.signOut();
  };

  // Botones modal con anim
  const ModalBtn = ({ label, variant, onPress }: { label: string; variant: "primary" | "ghost"; onPress: () => void }) => {
    const s = useRef(new Animated.Value(1)).current;
    const isPrimary = variant === "primary";

    return (
      <Animated.View style={{ flex: 1, transform: [{ scale: s }] }}>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={onPress}
          onPressIn={() => pressIn(s, 0.97)}
          onPressOut={() => pressOut(s)}
          style={isPrimary ? styles.btnGuardarNew : styles.btnCancelarNew}
        >
          {isPrimary ? (
            <>
              <View style={styles.gIcon}>
                <Text style={styles.gIconText}></Text>
              </View>
              <Text style={styles.btnGuardarText}>{label}</Text>
            </>
          ) : (
            <Text style={styles.btnCancelarText}>{label}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* PANEL */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primary + "DD", COLORS.primary + "AA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.panelGrad}
      >
        {/* Ribbons */}
        <Animated.View
          style={[
            styles.ribbon,
            {
              transform: [
                { translateX: ribbon1.interpolate({ inputRange: [0, 1], outputRange: [-80, 320] }) },
                { translateY: -12 },
                { rotateZ: "-20deg" },
              ],
              opacity: 0.18,
              backgroundColor: COLORS.white,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ribbon,
            {
              transform: [
                { translateX: ribbon2.interpolate({ inputRange: [0, 1], outputRange: [-140, 320] }) },
                { translateY: 18 },
                { rotateZ: "-20deg" },
              ],
              opacity: 0.14,
              backgroundColor: COLORS.white,
              height: 24,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ribbon,
            {
              transform: [
                { translateX: ribbon3.interpolate({ inputRange: [0, 1], outputRange: [-200, 320] }) },
                { translateY: 46 },
                { rotateZ: "-20deg" },
              ],
              opacity: 0.1,
              backgroundColor: COLORS.white,
              height: 18,
            },
          ]}
        />

        <View style={styles.panelContent}>
          <View>
            <Text style={[FONTS.small, { color: COLORS.white, textTransform: "uppercase", letterSpacing: 1.2 }]}>
              Panel
            </Text>
            <Text style={[FONTS.title, { color: COLORS.white, fontSize: 26, marginTop: 2 }]}>
              Mesero: {user?.nombre || "Usuario"}
            </Text>
            <Text style={[FONTS.small, { color: COLORS.white, opacity: 0.9, marginTop: 6 }]}>
              {now.toLocaleDateString()} • {now.toLocaleTimeString()}
            </Text>
          </View>

          <Animated.View style={{ transform: [{ scale: logoutScale }] }}>
            <TouchableOpacity style={styles.btnLogout} onPress={onLogout} activeOpacity={0.9}>
              <Text style={{ color: COLORS.white, fontWeight: "800" }}>Salir</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Métricas (más compactas, SIN encimarse) */}
        <View style={styles.statsGrid}>
          <StatCard label="Inconclusa" value={totalInconclusa} icon="progress-clock" />
          <StatCard label="Enviado" value={totalEnviado} icon="send" />
          <StatCard label="Entregado" value={totalEntregado} icon="check-circle" />
          <StatCard label="Todas" value={totalTodas} icon="format-list-bulleted" />
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Animated.View
          style={[
            styles.searchCard,
            {
              borderColor: searchFocus.interpolate({
                inputRange: [0, 1],
                outputRange: ["rgba(59,130,246,0.45)", "rgba(59,130,246,0.9)"],
              }),
            },
          ]}
        >
          <TextInput
            placeholder="Buscar: mesa, nota o platillo…"
            placeholderTextColor={COLORS.textGray}
            value={q}
            onChangeText={setQ}
            style={styles.searchInput}
            onFocus={() => Animated.timing(searchFocus, { toValue: 1, duration: 140, useNativeDriver: false }).start()}
            onBlur={() => Animated.timing(searchFocus, { toValue: 0, duration: 140, useNativeDriver: false }).start()}
          />
        </Animated.View>
      </View>

      {/* Filtros */}
      <View style={styles.filtersRow}>
        {(["Todas", "Inconclusa", "Enviado"] as Filtro[]).map((e) => (
          <FiltroChip key={e} label={e} />
        ))}
      </View>

      {/* Lista */}
      <Animated.View style={{ flex: 1, opacity: listFade, transform: [{ translateY: listTranslate }] }}>
        <FlatList
          data={dataFiltrada}
          renderItem={({ item }) => <MesaCard item={item} />}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <Text style={[FONTS.small, { textAlign: "center", marginTop: 30, color: COLORS.textGray }]}>
              No hay resultados 
            </Text>
          }
        />
      </Animated.View>

      {/* FAB */}
      <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabScale }, { rotate: fabRot }] }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={pressFab} style={styles.fab}>
          <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900", marginTop: -2 }}>＋</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* MODAL NUEVO */}
      <Modal visible={modalVisible} transparent animationType="fade" statusBarTranslucent>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />

          <Animated.View style={[styles.modalCardNew, { opacity: modalOpacity, transform: [{ scale: modalScale }] }]}>
            <View style={styles.modalHeaderNew}>
              <Text style={styles.modalTitleNew}>Abrir nueva mesa</Text>
              <Text style={styles.modalSubtitleNew}>Completa los datos</Text>
            </View>

            <View style={styles.modalInputsNew}>
              {/* Número de mesa */}
              <View style={[styles.inputPill, focusField === "mesa" && styles.inputPillActive]}>
                <View style={styles.inputIconBox}>
                  <MaterialCommunityIcons name="seat" size={22} color={COLORS.primary} />
                </View>
                <TextInput
                  placeholder="Número de mesa"
                  placeholderTextColor={COLORS.textGray}
                  keyboardType="numeric"
                  value={numeroMesa}
                  onChangeText={setNumeroMesa}
                  onFocus={() => setFocusField("mesa")}
                  onBlur={() => setFocusField(null)}
                  style={styles.inputPillText}
                />
              </View>

              {/* Personas */}
              <View style={[styles.inputPill, focusField === "ocupantes" && styles.inputPillActiveSoft]}>
                <View style={styles.inputIconBox}>
                  <MaterialCommunityIcons name="account-group" size={22} color={COLORS.textGray} />
                </View>
                <TextInput
                  placeholder="Personas"
                  placeholderTextColor={COLORS.textGray}
                  keyboardType="numeric"
                  value={ocupantes}
                  onChangeText={setOcupantes}
                  onFocus={() => setFocusField("ocupantes")}
                  onBlur={() => setFocusField(null)}
                  style={styles.inputPillText}
                />
                <Text style={styles.inputRightValue}>{ocupantes || "0"}</Text>
              </View>

              {/* Nota */}
              <View style={[styles.inputPill, focusField === "nota" && styles.inputPillActiveSoft]}>
                <View style={styles.inputIconBox}>
                  <MaterialCommunityIcons name="square-edit-outline" size={22} color={COLORS.textGray} />
                </View>
                <TextInput
                  placeholder="Nota (opcional)"
                  placeholderTextColor={COLORS.textGray}
                  value={nota}
                  onChangeText={setNota}
                  onFocus={() => setFocusField("nota")}
                  onBlur={() => setFocusField(null)}
                  style={styles.inputPillText}
                />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <ModalBtn label="Guardar" variant="primary" onPress={agregarMesa} />
              <ModalBtn label="Cancelar" variant="ghost" onPress={() => setModalVisible(false)} />
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* === ESTILOS === */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },

  // Panel
  panelGrad: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingTop: Platform.OS === "ios" ? 12 : 8,
    paddingBottom: 14,
    overflow: "hidden",
  },
  ribbon: { position: "absolute", left: -160, width: 260, height: 28, borderRadius: 14 },
  panelContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  btnLogout: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },

  // ====== STATS compactas ======
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  statCard: {
    width: "48.8%",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  statLabel: {
    flex: 1,
    marginTop: 0,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.92)",
  },
  statValue: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.white,
  },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  searchCard: {
    borderWidth: 2,
    borderRadius: 14,
    backgroundColor: COLORS.white,
  },
  searchInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textDark,
  },

  // Filtros
  filtersRow: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  filterChipText: { fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },

  // Lista / Card
  cardWrap: { position: "relative", marginTop: 12 },
  stripe: { position: "absolute", left: 10, top: 12, bottom: 12, width: 6, borderRadius: 999 },
  card: {
    borderRadius: CARD.borderRadius,
    backgroundColor: CARD.backgroundColor,
    shadowColor: CARD.shadowColor,
    shadowOffset: CARD.shadowOffset,
    shadowOpacity: CARD.shadowOpacity,
    shadowRadius: CARD.shadowRadius,
    elevation: CARD.elevation,
    padding: CARD.padding,
    paddingLeft: CARD.padding - 4,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  mesaTitle: { letterSpacing: 0.2, color: COLORS.textDark },
  subText: { color: COLORS.textGray },

  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },

  pedidosBox: { marginTop: 8, borderRadius: 12, padding: 10, borderWidth: 1 },
  platilloRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bgLight,
  },
  platilloNombre: { fontWeight: "700", color: COLORS.textDark, flex: 1, paddingRight: 8 },
  platilloPrecio: { color: COLORS.accent, fontWeight: "900" },
  sinPedidos: { fontStyle: "italic", color: COLORS.textGray, marginTop: 4 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 6 },
  totalLabel: { color: COLORS.textGray, fontWeight: "700" },
  totalValue: { color: COLORS.primary, fontWeight: "900" },

  buttons: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnOutline: { backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.accent },
  btnTextOutline: { color: COLORS.accent, fontWeight: "900" },
  btnSolid: { backgroundColor: COLORS.primary },
  btnTextSolid: { color: COLORS.white, fontWeight: "900" },

  // FAB
  fabWrap: { position: "absolute", right: 18, bottom: 24 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  // ========= MODAL NUEVO =========
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.40)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },

  modalCardNew: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },

  modalHeaderNew: { alignItems: "center", paddingBottom: 10 },
  modalTitleNew: { fontSize: 28, fontWeight: "900", color: COLORS.textDark },
  modalSubtitleNew: { marginTop: 4, fontSize: 16, fontWeight: "700", color: COLORS.textGray },

  modalInputsNew: { marginTop: 10, gap: 12 },

  inputPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  inputPillActive: { borderColor: COLORS.primary, backgroundColor: "rgba(124,58,237,0.08)" },
  inputPillActiveSoft: { borderColor: "rgba(148,163,184,0.28)", backgroundColor: "#F3F4F6" },

  inputIconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.20)",
  },

  inputPillText: { flex: 1, fontSize: 16, color: COLORS.textDark, paddingVertical: 2 },

  inputRightValue: { marginLeft: 10, fontSize: 16, fontWeight: "800", color: COLORS.textGray },

  modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 16 },

  btnGuardarNew: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  gIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  gIconText: { color: "#fff", fontWeight: "900" },
  btnGuardarText: { color: "#fff", fontWeight: "900", fontSize: 16 },

  btnCancelarNew: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  btnCancelarText: { color: COLORS.textDark, fontWeight: "900", fontSize: 16 },
});