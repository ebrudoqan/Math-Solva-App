import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import api, { saveTokens } from "../services/api";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      await saveTokens(data.accessToken, data.refreshToken);
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    } catch (e: any) {
      setError(e.response?.data?.detail || "Giriş yapılamadı. Sunucuya ulaşılamıyor olabilir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Math Solva APP</Text>
      <Text style={styles.subtitle}>Hesabına giriş yap</Text>

      <TextInput
        style={styles.input}
        placeholder="E-posta"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="E-posta adresi"
      />
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        accessibilityLabel="Şifre"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>Hesabın yok mu? Kayıt ol</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e", justifyContent: "center", padding: 24 },
  title: { fontSize: 32, fontWeight: "800", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#aaa", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#25253d",
    color: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#6c5ce7",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { color: "#a29bfe", textAlign: "center", marginTop: 20 },
  error: { color: "#ff7675", marginBottom: 8, textAlign: "center" },
});
