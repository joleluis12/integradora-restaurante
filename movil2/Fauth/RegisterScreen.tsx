import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Animated,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../supabase/supabaseClient";
import { COLORS, FONTS, CARD } from "../styles/theme";

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<null | "email" | "password">(null);

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

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 2800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("⚠️ Campos vacíos", "Por favor completa todos los campos");
      return;
    }

    if (password.length < 6) {
      Alert.alert("⚠️ Contraseña débil", "Debe tener al menos 6 caracteres");
      return;
    }

    try {
      setLoading(true);

      // 🔹 Solo creamos el usuario — NO insertamos perfil manualmente
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        console.log("❌ Error en signUp:", error.message);
        Alert.alert("❌ Error al registrar", error.message);
        return;
      }

      if (data.user) {
        Alert.alert(
          "✅ Registro exitoso",
          "Cuenta creada correctamente. Ya puedes iniciar sesión.",
          [{ text: "Iniciar sesión", onPress: () => navigation.navigate("Login") }]
        );
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
    <LinearGradient colors={[COLORS.violet, COLORS.accent]} style={styles.bg}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, width: "100%" }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {/* Burbujas decorativas */}
          <Animated.View style={[styles.bgCircle1, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.bgCircle2} />
          <View style={styles.bgCircle3} />

          {/* Card estilo glass */}
          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.icon}>🧾</Text>
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>Registra un nuevo mesero para el sistema</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <View style={[styles.inputWrapper, focused === "email" && styles.inputWrapperFocused]}>
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={[styles.inputWrapper, focused === "password" && styles.inputWrapperFocused]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} activeOpacity={0.7}>
                  <Text style={styles.eye}>{showPassword ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
              </View>
              {/* Hint de fuerza (simple, no intrusivo) */}
              <Text style={styles.hint}>
                {password.length === 0
                  ? "Usa 6+ caracteres. Combina letras y números."
                  : password.length < 6
                  ? "Contraseña muy corta."
                  : password.length < 10
                  ? "Fuerza: media."
                  : "Fuerza: buena."}
              </Text>
            </View>

            {/* Botón */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[styles.btnTouchable, loading && styles.btnDisabled]}
                onPress={() => {
                  animateButton();
                  handleRegister();
                }}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[COLORS.violet, COLORS.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btnGrad}
                >
                  {loading ? (
                    <View style={styles.btnContent}>
                      <ActivityIndicator color={COLORS.white} size="small" />
                      <Text style={styles.btnText}>Registrando...</Text>
                    </View>
                  ) : (
                    <Text style={styles.btnText}>Registrarse</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Enlace */}
            <TouchableOpacity onPress={() => navigation.navigate("Login")} activeOpacity={0.8}>
              <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesión</Text>
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

  // Card estilo glass + tu CARD base
  card: {
    ...CARD,
    width: "88%",
    maxWidth: 440,
    padding: 28,
    backgroundColor: "rgba(255,255,255,0.90)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    borderRadius: 28,
  },

  icon: { fontSize: 48, textAlign: "center", marginBottom: 8 },
  title: { ...FONTS.title, textAlign: "center", marginBottom: 4, color: COLORS.textDark },
  subtitle: {
    ...FONTS.small,
    textAlign: "center",
    marginBottom: 22,
    color: COLORS.textGray,
  },

  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
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

  hint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textGray,
    marginLeft: 4,
  },

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

  link: {
    marginTop: 20,
    textAlign: "center",
    color: COLORS.accent,
    fontWeight: "600",
    fontSize: 15,
  },
});
