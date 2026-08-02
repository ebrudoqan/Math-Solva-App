import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api, { clearTokens } from "../services/api";

interface Me {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export default function ProfileScreen({ navigation }: any) {
  const [me, setMe] = useState<Me | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [topicCount, setTopicCount] = useState(0);
  const [examCount, setExamCount] = useState(0);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      Promise.all([
        api.get("/auth/me"),
        api.get("/questions"),
        api.get("/questions/topics"),
        api.get("/exam/history"),
      ])
        .then(([meRes, qRes, tRes, eRes]) => {
          if (!active) return;
          setMe(meRes.data);
          setQuestionCount(qRes.data.length);
          setTopicCount(tRes.data.length);
          const completed = eRes.data.filter((e: any) => e.status === "completed");
          setExamCount(completed.length);
          if (completed.length > 0) {
            const avg = completed.reduce((sum: number, e: any) => sum + (e.score || 0), 0) / completed.length;
            setAvgScore(avg);
          }
        })
        .catch(() => {})
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [])
  );

  async function handleLogout() {
    await clearTokens();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator color="#6c5ce7" />
      </View>
    );
  }

  const initials = (me?.name || me?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{me?.name || "İsimsiz Kullanıcı"}</Text>
        <Text style={styles.email}>{me?.email}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{questionCount}</Text>
          <Text style={styles.statLabel}>Çözülen Soru</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{topicCount}</Text>
          <Text style={styles.statLabel}>Konu</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{examCount}</Text>
          <Text style={styles.statLabel}>Tamamlanan Sınav</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{avgScore !== null ? Math.round(avgScore) : "-"}</Text>
          <Text style={styles.statLabel}>Ortalama Puan</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  header: { alignItems: "center", marginBottom: 32, marginTop: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6c5ce7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  name: { fontSize: 20, fontWeight: "700", color: "#fff" },
  email: { fontSize: 14, color: "#aaa", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
  statCard: {
    width: "47%",
    backgroundColor: "#25253d",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginRight: "3%",
    marginBottom: 12,
  },
  statValue: { fontSize: 28, fontWeight: "800", color: "#00cec9" },
  statLabel: { fontSize: 12, color: "#aaa", marginTop: 6, textAlign: "center" },
  logoutButton: {
    borderColor: "#ff7675",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  logoutButtonText: { color: "#ff7675", fontWeight: "700", fontSize: 16 },
});
