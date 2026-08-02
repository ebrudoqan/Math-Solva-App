import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

export default function ExamSetupScreen({ navigation, route }: any) {
  const [topics, setTopics] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(route.params?.preselectTopic ? [route.params.preselectTopic] : [])
  );
  const [duration, setDuration] = useState(15);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      api
        .get("/questions/topics")
        .then(({ data }) => setTopics(data.map((t: any) => t.topic)))
        .catch(() => {});
    }, [])
  );

  function toggleTopic(topic: string) {
    const next = new Set(selected);
    next.has(topic) ? next.delete(topic) : next.add(topic);
    setSelected(next);
  }

  async function handleStart() {
    if (selected.size === 0) {
      setError("En az bir konu seç.");
      return;
    }
    setError("");
    setStarting(true);
    try {
      const { data } = await api.post("/exam/start", {
        topics: Array.from(selected),
        durationMinutes: duration,
        questionCount: 10,
      });
      navigation.navigate("Exam", { exam: data });
    } catch (e: any) {
      setError(e.response?.data?.detail || "Sınav başlatılamadı.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <Text style={styles.title}>Sınav Ayarları</Text>

      <Text style={styles.label}>Konu(lar) seç:</Text>
      {topics.length === 0 ? (
        <Text style={styles.empty}>Önce ana sayfadan birkaç soru sormalısın.</Text>
      ) : (
        <View style={styles.chipRow}>
          {topics.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, selected.has(t) && styles.chipSelected]}
              onPress={() => toggleTopic(t)}
            >
              <Text style={[styles.chipText, selected.has(t) && styles.chipTextSelected]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Süre (dakika):</Text>
      <View style={styles.chipRow}>
        {DURATION_OPTIONS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, duration === d && styles.chipSelected]}
            onPress={() => setDuration(d)}
          >
            <Text style={[styles.chipText, duration === d && styles.chipTextSelected]}>{d} dk</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleStart} disabled={starting}>
        {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sınavı Başlat</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", marginBottom: 24 },
  label: { color: "#ccc", fontSize: 15, marginBottom: 10, marginTop: 10, fontWeight: "600" },
  empty: { color: "#aaa", marginBottom: 20 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    backgroundColor: "#25253d",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: "#6c5ce7" },
  chipText: { color: "#ccc", fontWeight: "600" },
  chipTextSelected: { color: "#fff" },
  button: { backgroundColor: "#6c5ce7", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 30 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: "#ff7675", marginTop: 12, textAlign: "center" },
});
