import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../supabase/supabaseClient";
import { COLORS } from "../styles/theme";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();

    // Pulso suave del fondo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 2800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("⚠️ Campos vacíos", "Por favor completa todos los campos");
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.log("❌ Error al iniciar sesión:", error.message);
        Alert.alert("Error", error.message);
        return;
      }

      const user = data?.user;
      if (!user) {
        Alert.alert("Error", "No se pudo obtener el usuario autenticado.");
        return;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (perfilError) {
        console.log("⚠️ Error cargando perfil:", perfilError.message);
      }

      const perfilFinal = perfil || {
        id: user.id,
        nombre: user.email.split("@")[0],
        rol: "Mesero",
      };

      const userData = { id: user.id, ...perfilFinal };

      if (userData.rol === "Mesero") {
        navigation.navigate("HomeScreen", { user: userData });
      } else if (userData.rol === "Cocina") {
        navigation.navigate("CocinaScreen", { user: userData });
      } else {
        Alert.alert("Error", "Rol no válido o no definido");
      }
    } catch (err: any) {
      console.log("❌ Error inesperado:", err.message);
      Alert.alert("Error inesperado", err.message);
    } finally {
      setLoading(false);
    }
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  return (
    <LinearGradient colors={[COLORS.accent, COLORS.primary]} style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, width: "100%" }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContainer}
        >
          {/* Background decorativo */}
          <Animated.View style={[styles.bgCircle1, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.bgCircle2} />
          <View style={styles.bgCircle3} />

          {/* Tarjeta glass */}
          <Animated.View
            style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <Text style={styles.icon}>👨‍🍳</Text>
            <Text style={styles.title}>Acceso de Meseros</Text>
            <Text style={styles.subtitle}>Gestiona pedidos con tu cuenta</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === "email" && styles.inputWrapperFocused,
                ]}
              >
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedInput === "password" && styles.inputWrapperFocused,
                ]}
              >
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eye}>{showPassword ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Botón */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[styles.btnTouchable, loading && styles.btnDisabled]}
                onPress={() => {
                  animateButton();
                  handleLogin();
                }}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnGrad}
                >
                  {loading ? (
                    <View style={styles.btnContent}>
                      <ActivityIndicator color={COLORS.white} size="small" />
                      <Text style={styles.btnText}>Cargando...</Text>
                    </View>
                  ) : (
                    <Text style={styles.btnText}>Ingresar</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Separador */}
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.line} />
            </View>

            {/* Enlace registro */}
            <TouchableOpacity onPress={() => navigation.navigate("Register")} activeOpacity={0.8}>
              <Text style={styles.link}>
                ¿No tienes cuenta? <Text style={styles.linkBold}>Regístrate aquí</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 56,
  },

  // Burbujas decorativas
  bgCircle1: {
    position: "absolute",
    top: -120,
    right: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  bgCircle2: {
    position: "absolute",
    bottom: -140,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  bgCircle3: {
    position: "absolute",
    top: "40%",
    left: "50%",
    width: 420,
    height: 420,
    marginLeft: -210,
    marginTop: -210,
    borderRadius: 210,
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  // Tarjeta estilo glass
  card: {
    width: "88%",
    maxWidth: 440,
    borderRadius: 28,
    padding: 28,
    backgroundColor: "#572364",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    // sombra
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    backdropFilter: "blur(8px)" as any, // iOS simulado
  },

  icon: { fontSize: 52, textAlign: "center", marginBottom: 8 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textGray,
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "500",
  },

  // Inputs
  inputGroup: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 14,
    // sutil sombra para resaltar
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inputWrapperFocused: {
    borderColor: COLORS.accent,
    backgroundColor: "#FFFFFF",
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.textDark,
  },
  eye: { fontSize: 18, paddingLeft: 8 },

  // Botón
  btnTouchable: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 6,
  },
  btnGrad: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.8 },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 17,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Divider y enlaces
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: {
    marginHorizontal: 14,
    color: COLORS.textGray,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  link: {
    textAlign: "center",
    color: COLORS.textGray,
    fontWeight: "500",
    fontSize: 15,
  },
  linkBold: { color: COLORS.white, fontWeight: "800" },
});
