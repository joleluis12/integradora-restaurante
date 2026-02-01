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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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

  const listFade = useRef(new Animated.Value(0)).current;
  const listTranslate = useRef(new Animated.Value(8)).current;
  const fabScale = useRef(new Animated.Value(1)).current;

  // Ribbons animadas del panel
  const ribbon1 = useRef(new Animated.Value(0)).current;
  const ribbon2 = useRef(new Animated.Value(0)).current;
  const ribbon3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user?.id) {
      void fetchMesas();
      activarTiempoReal();
    }
    // ✅ cleanup sin Promise
    return () => {
      void supabase.removeAllChannels();
    };
  }, [user?.id]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(listFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(listTranslate, { toValue: 0, duration: 350, useNativeDriver: true }),
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

  // Data
  const fetchMesas = async () => {
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, detalle_pedidos( id, cantidad, nota, platillos(nombre, precio) )")
        .eq("id_mesero", user.id)
        .neq("estado", "Completada")
        .order("created_at", { ascending: false });
      if (error) console.log("❌ Error cargando mesas:", error.message);
      else setMesas(data || []);
    } catch (err: any) {
      console.log("❌ Error:", err.message);
    }
  };

  // No async; callbacks sin devolver promesa
  const activarTiempoReal = () => {
    supabase
      .channel("pedidos_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          void fetchMesas();
        }
      )
      .subscribe();

    supabase
      .channel("detalle_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "detalle_pedidos" },
        () => {
          void fetchMesas();
        }
      )
      .subscribe();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMesas();
    setRefreshing(false);
  }, []);

  const agregarMesa = async () => {
    if (!numeroMesa) return Alert.alert("⚠️ Ingresa el número de mesa");
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
        console.log("❌ Error al agregar mesa:", error.message);
        Alert.alert("Error", "No se pudo agregar la mesa");
      } else {
        setModalVisible(false);
        setNumeroMesa("");
        setOcupantes("");
        setNota("");
      }
    } catch (err: any) {
      console.log("❌ Error:", err.message);
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
        const nombres = (x.detalle_pedidos || []).map((p: any) => p?.platillos?.nombre || "").join(" ").toLowerCase();
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

  const MesaCard = memo(({ item }: { item: any }) => {
    const { chipBg, chip, stripe } = estadoColors(item.estado as Estado);
    const totalMesa =
      item?.detalle_pedidos?.reduce(
        (acc: number, p: any) => acc + (Number(p?.platillos?.precio) || 0) * (Number(p?.cantidad) || 0),
        0
      ) || 0;

    return (
      <View style={styles.cardWrap}>
        <View style={[styles.stripe, { backgroundColor: stripe }]} />
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
            <TouchableOpacity
              style={[styles.btn, styles.btnOutline]}
              onPress={() => navigation.navigate("MenuScreen", { mesa: item })}
              activeOpacity={0.9}
            >
              <Text style={[FONTS.subtitle, styles.btnTextOutline]}>Menú</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnSolid]}
              onPress={() => navigation.navigate("CuentaScreen", { mesa: item })}
              activeOpacity={0.9}
            >
              <Text style={[FONTS.subtitle, styles.btnTextSolid]}>Cuenta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  });

  const pressFab = () => {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start(() => setModalVisible(true));
  };

  const FiltroChip = ({ label }: { label: Filtro }) => {
    const active = filtro === label;
    return (
      <TouchableOpacity
        onPress={() => setFiltro(active ? "Todas" : label)}
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
    );
  };

  // reloj para el panel
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <View style={styles.container}>
      {/* PANEL mejorado */}
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

          <TouchableOpacity style={styles.btnLogout} onPress={async () => await supabase.auth.signOut()}>
            <Text style={{ color: COLORS.white, fontWeight: "800" }}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Métricas */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statTitle}>Inconclusa</Text>
            <Text style={styles.statCount}>{totalInconclusa}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statTitle}>Enviado</Text>
            <Text style={styles.statCount}>{totalEnviado}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statTitle}>Entregado</Text>
            <Text style={styles.statCount}>{totalEntregado}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statTitle}>Todas</Text>
            <Text style={styles.statCount}>{totalTodas}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Buscar: mesa, nota o platillo…"
          placeholderTextColor={COLORS.textGray}
          value={q}
          onChangeText={setQ}
          style={styles.searchInput}
        />
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[FONTS.small, { textAlign: "center", marginTop: 30, color: COLORS.textGray }]}>
              No hay resultados 🍽️
            </Text>
          }
        />
      </Animated.View>

      {/* FAB */}
      <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={pressFab} style={styles.fab}>
          <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900", marginTop: -2 }}>＋</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, CARD, { padding: 18 }]}>
            <Text style={[FONTS.title, styles.modalTitle]}>Abrir nueva mesa</Text>
            <Text style={[FONTS.small, styles.modalSubtitle]}>Completa los datos</Text>

            <View style={styles.inputsRow}>
              <TextInput
                placeholder="Número de mesa"
                keyboardType="numeric"
                value={numeroMesa}
                onChangeText={setNumeroMesa}
                style={[styles.input, { flex: 1 }]}
                placeholderTextColor={COLORS.textGray}
              />
              <View style={{ width: 12 }} />
              <TextInput
                placeholder="Ocupantes"
                keyboardType="numeric"
                value={ocupantes}
                onChangeText={setOcupantes}
                style={[styles.input, { flex: 1 }]}
                placeholderTextColor={COLORS.textGray}
              />
            </View>

            <TextInput
              placeholder="Nota (opcional)"
              value={nota}
              onChangeText={setNota}
              style={styles.input}
              placeholderTextColor={COLORS.textGray}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={agregarMesa} activeOpacity={0.9}>
                <Text style={[FONTS.subtitle, styles.modalBtnText]}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.9}
              >
                <Text style={[FONTS.subtitle, styles.modalBtnText]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    paddingBottom: 16,
    overflow: "hidden",
  },
  ribbon: {
    position: "absolute",
    left: -160,
    width: 260,
    height: 28,
    borderRadius: 14,
  },
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
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  stat: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: COLORS.white,
  },
  statCount: { fontSize: 20, fontWeight: "900", marginTop: 2, color: COLORS.white },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  searchInput: {
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textDark,
  },

  // Filtros
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
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
    marginHorizontal: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  mesaTitle: { letterSpacing: 0.2, color: COLORS.textDark },
  subText: { color: COLORS.textGray },

  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },

  pedidosBox: {
    marginTop: 8,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
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

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: CARD.borderRadius,
    backgroundColor: CARD.backgroundColor,
    shadowColor: CARD.shadowColor,
    shadowOffset: CARD.shadowOffset,
    shadowOpacity: CARD.shadowOpacity,
    shadowRadius: CARD.shadowRadius,
    elevation: CARD.elevation,
  },
  modalTitle: { color: COLORS.textDark },
  modalSubtitle: { color: COLORS.textGray, marginTop: 2, marginBottom: 8 },
  inputsRow: { flexDirection: "row", marginTop: 6 },
  input: {
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: 14,
    padding: 12,
    backgroundColor: COLORS.bgLight,
    fontSize: 16,
    color: COLORS.textDark,
    marginTop: 12,
  },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  modalConfirm: { backgroundColor: COLORS.primary },
  modalCancel: { backgroundColor: COLORS.danger },
  modalBtnText: { color: COLORS.white, fontWeight: "800" },
});
