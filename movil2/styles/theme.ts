// styles/theme.ts
import { TextStyle } from "react-native";

export const COLORS = {
  primary: "#572364",   // verde principal
  accent: "#3B82F6",    // azul vibrante
  violet: "#8B5CF6",    // morado acento
  warn: "#F59E0B",      // amarillo advertencia
  danger: "#EF4444",    // rojo error

  // Nuevos añadidos inspirados en tu otra paleta
  darkBg: "#111827",     // fondo dark opcional
  darkCard: "#0B1220",   // tarjetas dark
  white: "#FFFFFF",      // blanco puro
  bgLight: "#F9FAFB",    // fondo claro
  textDark: "#1F2937",   // texto fuerte
  textGray: "#6B7280",   // texto tenue
};

export const FONTS: Record<string, TextStyle> = {
  title: { fontSize: 24, fontWeight: "700", color: COLORS.textDark },
  subtitle: { fontSize: 18, fontWeight: "600", color: COLORS.textDark },
  body: { fontSize: 16, fontWeight: "400", color: COLORS.textDark },
  small: { fontSize: 14, fontWeight: "400", color: COLORS.textGray },
};

export const CARD = {
  borderRadius: 16,
  backgroundColor: COLORS.white, // puedes alternar con COLORS.darkCard si haces modo oscuro
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.07,
  shadowRadius: 6,
  elevation: 2,
  padding: 20,
};
