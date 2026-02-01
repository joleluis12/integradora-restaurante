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
      setErrorMsg("⚠️ Por favor completa todos los campos");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) setErrorMsg("❌ " + error.message);
      else if (data.user) onLogin(data.user);
    } catch (err) {
      if (err instanceof Error) setErrorMsg("Error inesperado: " + err.message);
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
      {/* Elementos decorativos de fondo */}
      <div style={styles.bgCircle1}></div>
      <div style={styles.bgCircle2}></div>
      <div style={styles.bgCircle3}></div>

      <div style={styles.card}>
        {/* Icono decorativo superior */}
        <div style={styles.iconContainer}>
          <div style={styles.iconCircle}>
            <span style={styles.icon}>👨</span>
          </div>
        </div>

        <h1 style={styles.title}>Acceso de Admin</h1>
        <p style={styles.subtitle}>Inicia sesión para gestionar tus pedidos</p>

        {errorMsg && (
          <div style={styles.error}>
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Correo electrónico</label>
          <input
            type="email"
            placeholder="ejemplo@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedInput("email")}
            onBlur={() => setFocusedInput(null)}
            onKeyPress={handleKeyPress}
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
            onKeyPress={handleKeyPress}
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
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(16, 185, 129, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.3)";
          }}
        >
          {loading ? (
            <span style={styles.buttonContent}>
              <span style={styles.spinner}></span>
              Cargando...
            </span>
          ) : (
            "Ingresar"
          )}
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerText}>o</span>
        </div>

        <p style={styles.footerText}>
          ¿No tienes cuenta?{" "}
          <span style={styles.link}>Contacta al administrador</span>
        </p>
      </div>

      <p style={styles.copyright}>© 2024 Restaurant Admin • Todos los derechos reservados</p>
    </div>
  );
}

// ============================
// 🎨 Estilos Mejorados
// ============================
const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100vh",
    background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.primary} 100%)`,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "system-ui, -apple-system, sans-serif",
    position: "relative",
    overflow: "hidden",
    paddingBottom: 80,
  },
  // Círculos decorativos de fondo
  bgCircle1: {
    position: "absolute",
    top: "-10%",
    right: "-5%",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    filter: "blur(60px)",
  },
  bgCircle2: {
    position: "absolute",
    bottom: "-15%",
    left: "-8%",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.06)",
    filter: "blur(80px)",
  },
  bgCircle3: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.03)",
    filter: "blur(100px)",
  },
  card: {
    background: "rgba(255,255,255,0.18)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1.5px solid rgba(255,255,255,0.3)",
    borderRadius: 28,
    padding: "45px 50px 40px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1) inset",
    width: 440,
    textAlign: "center",
    color: "#fff",
    animation: "fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
    position: "relative",
    zIndex: 1,
  },
  iconContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    border: "2px solid rgba(255,255,255,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
  },
  icon: {
    fontSize: 38,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
    color: "#fff",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 30,
    fontWeight: "500",
    letterSpacing: "0.2px",
  },
  error: {
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    color: "#fff",
    borderRadius: 12,
    padding: "12px 16px",
    marginBottom: 20,
    fontSize: 14,
    fontWeight: "600",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
    border: "1px solid rgba(255,255,255,0.2)",
    animation: "shake 0.4s ease",
  },
  inputGroup: {
    marginBottom: 18,
    textAlign: "left",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.95)",
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: "0.3px",
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1.5px solid rgba(255,255,255,0.25)",
    outline: "none",
    fontSize: 15,
    backgroundColor: "rgba(255,255,255,0.95)",
    color: "#1a1a1a",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    fontWeight: "500",
  },
  inputFocused: {
    backgroundColor: "#fff",
    border: "1.5px solid rgba(255,255,255,0.5)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.15), 0 0 0 3px rgba(255,255,255,0.15)",
    transform: "translateY(-1px)",
  },
  button: {
    width: "100%",
    backgroundColor: "#10B981",
    color: "#fff",
    padding: "14px 20px",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: "700",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
    marginTop: 8,
    letterSpacing: "0.3px",
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
    transform: "none",
  },
  buttonContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },
  spinner: {
    width: 16,
    height: 16,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    display: "inline-block",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    margin: "25px 0 20px",
    opacity: 0.6,
  },
  dividerText: {
    margin: "0 auto",
    padding: "0 15px",
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  footerText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: "0.2px",
  },
  link: {
    color: "#fff",
    fontWeight: "700",
    textDecoration: "none",
    cursor: "pointer",
    borderBottom: "2px solid rgba(255,255,255,0.5)",
    paddingBottom: 2,
    transition: "all 0.2s ease",
  },
  copyright: {
  marginTop: 40,
  marginBottom: 20,
  color: "rgba(255,255,255,0.7)",
  fontSize: 13,
  fontWeight: "500",
  letterSpacing: "0.3px",
  textAlign: "center",
},

};

// Añadir estilos de animación globalmente
const styleSheet = document.createElement("style");
styleSheet.textContent = `

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`;
styleSheet.textContent = `

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`;styleSheet.textContent += `
  /* =========================
     Scrollbar delgado
     ========================= */

  /* Chrome, Edge, Safari */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background-color: rgba(255,255,255,0.4);
    border-radius: 10px;
  }

  /* Firefox */
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.4) transparent;
  }
`;

document.head.appendChild(styleSheet);