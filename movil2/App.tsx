import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator, Platform } from "react-native";
import { supabase } from "./supabase/supabaseClient";

import HomeScreen from "./screens/HomeScreen";
import MenuScreen from "./screens/MenuScreen";
import CuentaScreen from "./screens/CuentaScreen";
import CocinaScreen from "./screens/CocinaScreen";
import LoginScreen from "./Fauth/LoginScreen";
import RegisterScreen from "./Fauth/RegisterScreen";

const COLORS = {
  primary: "#572364",
  background: "#FFFFFF",
  textDark: "#1F2937",
};

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data?.session?.user || null;
      setUser(currentUser);
      if (currentUser) await cargarPerfil(currentUser.id);
      setLoading(false);
    };
    fetchSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const activeUser = session?.user || null;
        setUser(activeUser);
        if (activeUser) await cargarPerfil(activeUser.id);
        else setPerfil(null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const cargarPerfil = async (userId: string) => {
    const { data } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setPerfil(data || null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? "HomeScreen" : "Login"}
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold", fontSize: 20 },
          animation: Platform.select({ ios: "slide_from_right", android: "slide_from_right" }),
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="HomeScreen" options={{ title: "Restaurante Villa Duarte" }}>
              {(props) => <HomeScreen {...props} user={{ ...user, ...perfil }} />}
            </Stack.Screen>

            <Stack.Screen
              name="MenuScreen"
              component={MenuScreen}
              options={{ title: "Menú" }}
            />
            <Stack.Screen
              name="CuentaScreen"
              component={CuentaScreen}
              options={{ title: "Cuenta" }}
            />
            <Stack.Screen
              name="CocinaScreen"
              component={CocinaScreen}
              options={{ title: "Cocina" }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Iniciar Sesión" }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Registrarse" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
