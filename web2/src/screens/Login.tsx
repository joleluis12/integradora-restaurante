import React, { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { COLORS } from "../styles/theme";

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Por favor completa todos los campos");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data.user) {
        onLogin(data.user);
      }
    } catch (err) {
      if (err instanceof Error) {
        setErrorMsg("Error inesperado: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Acceso de Admin</h1>
        <p style={styles.subtitle}>
          Inicia sesión para gestionar tus pedidos
        </p>

        {errorMsg && <div style={styles.error}>{errorMsg}</div>}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Correo electrónico</label>
          <input
            type="email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedInput("email")}
            onBlur={() => setFocusedInput(null)}
            onKeyDown={handleKeyPress}
            style={{
              ...styles.input,
              ...(focusedInput === "email" ? styles.inputFocused : {}),
            }}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedInput("password")}
            onBlur={() => setFocusedInput(null)}
            onKeyDown={handleKeyPress}
            style={{
              ...styles.input,
              ...(focusedInput === "password" ? styles.inputFocused : {}),
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {}),
          }}
        >
          {loading ? "Cargando..." : "Ingresar"}
        </button>

        <p style={styles.footerText}>
          ¿No tienes cuenta?{" "}
          <span style={styles.link}>Contacta al administrador</span>
        </p>
      </div>

      <p style={styles.copyright}>
        © 2024 Restaurant Admin • Todos los derechos reservados
      </p>
    </div>
  );
}

/* ================================
   ESTILOS CON NUEVA PALETA OSCURA
================================ */

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100vh",
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "system-ui, -apple-system, sans-serif",
    paddingBottom: 80,
  },

  card: {
    background: COLORS.white,
    borderRadius: 24,
    padding: "40px 45px",
    width: 420,
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    color: COLORS.textDark,
  },

  title: {
    fontSize: 30,
    fontWeight: 800,
    marginBottom: 8,
    color: COLORS.textDark,
  },

  subtitle: {
    fontSize: 14,
    marginBottom: 30,
    color: COLORS.violet,
  },

  error: {
    backgroundColor: COLORS.danger,
    color: "#fff",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 20,
    fontWeight: 600,
  },

  inputGroup: {
    marginBottom: 18,
    textAlign: "left",
  },

  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: COLORS.textDark,
  },

  input: {
    width: "100%",
    padding: "14px",
    borderRadius: 10,
    border: `1px solid ${COLORS.violet}`,
    backgroundColor: "#111827",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    transition: "all 0.2s ease",
  },

  inputFocused: {
    border: `1px solid ${COLORS.accent}`,
    boxShadow: `0 0 0 3px rgba(37, 99, 235, 0.3)`,
  },

  button: {
    width: "100%",
    backgroundColor: COLORS.primary,
    color: "#fff",
    padding: "14px",
    borderRadius: 10,
    border: "none",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 10,
    transition: "all 0.2s ease",
  },

  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  footerText: {
    marginTop: 20,
    fontSize: 13,
    color: COLORS.textDark,
  },

  link: {
    color: COLORS.accent,
    fontWeight: 700,
    cursor: "pointer",
  },

  copyright: {
    marginTop: 35,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
};
