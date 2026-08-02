import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

export default function ExamResultScreen({ navigation, route }: any) {
  const { result, auto } = route.params; // { score, correctCount, totalCount, review }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      {auto && <Text style={styles.autoNotice}>⏰ Süre doldu, sınav otomatik gönderildi.</Text>}

      <Text style={styles.title}>Sınav Sonucu</Text>
      <View style={styles.scoreCard}>
        <Text style={styles.scoreText}>{Math.round(result.score)}</Text>
        <Text style={styles.scoreLabel}>/ 100</Text>
      </View>
      <Text style={styles.correctText}>
        {result.correctCount} / {result.totalCount} doğru
      </Text>

      <Text style={styles.sectionTitle}>Cevap Anahtarı</Text>
      {result.review.map((r: any) => (
        <View key={r.index} style={styles.reviewCard}>
          <Text style={styles.reviewIndex}>Soru {r.index + 1}</Text>
          <Text style={styles.reviewLine}>
            Senin cevabın: <Text style={styles.reviewValue}>{r.user_answer || "(boş)"}</Text>
          </Text>
          <Text style={styles.reviewLine}>
            Doğru cevap: <Text style={styles.reviewValueCorrect}>{r.correct_answer}</Text>
          </Text>
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Home")}>
        <Text style={styles.buttonText}>Ana Sayfaya Dön</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  autoNotice: { color: "#fdcb6e", textAlign: "center", marginBottom: 12, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: 20 },
  scoreCard: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", marginBottom: 8 },
  scoreText: { fontSize: 56, fontWeight: "900", color: "#00cec9" },
  scoreLabel: { fontSize: 20, color: "#aaa", marginBottom: 10, marginLeft: 4 },
  correctText: { color: "#ccc", textAlign: "center", marginBottom: 24, fontSize: 15 },
  sectionTitle: { color: "#a29bfe", fontWeight: "700", fontSize: 16, marginBottom: 12 },
  reviewCard: { backgroundColor: "#25253d", borderRadius: 12, padding: 14, marginBottom: 10 },
  reviewIndex: { color: "#fff", fontWeight: "700", marginBottom: 6 },
  reviewLine: { color: "#ccc", fontSize: 14, marginBottom: 2 },
  reviewValue: { color: "#fff", fontWeight: "600" },
  reviewValueCorrect: { color: "#00cec9", fontWeight: "600" },
  button: { backgroundColor: "#6c5ce7", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
