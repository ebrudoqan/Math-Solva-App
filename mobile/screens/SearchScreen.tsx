import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";

interface QuestionItem {
  id: string;
  question: string;
  topic: string;
  difficulty: string;
  final_answer: string;
  created_at: string;
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      api
        .get("/questions")
        .then(({ data }) => active && setQuestions(data))
        .catch(() => {})
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        item.final_answer.toLowerCase().includes(q)
    );
  }, [query, questions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sorularımda Ara</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Soru, konu veya cevaba göre ara..."
        placeholderTextColor="#888"
        value={query}
        onChangeText={setQuery}
        accessibilityLabel="Soru arama alanı"
      />

      {loading ? (
        <ActivityIndicator color="#6c5ce7" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>
          {questions.length === 0
            ? "Henüz hiç soru sormadın."
            : "Aramanla eşleşen bir soru bulunamadı."}
        </Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            const expanded = expandedId === item.id;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => setExpandedId(expanded ? null : item.id)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.topicBadge}>{item.topic}</Text>
                  <Text style={styles.date}>
                    {new Date(item.created_at).toLocaleDateString("tr-TR")}
                  </Text>
                </View>
                <Text style={styles.questionText} numberOfLines={expanded ? undefined : 2}>
                  {item.question}
                </Text>
                {expanded && (
                  <Text style={styles.answerText}>Cevap: {item.final_answer}</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e", padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginBottom: 16 },
  searchInput: {
    backgroundColor: "#25253d",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 20,
  },
  empty: { color: "#aaa", textAlign: "center", marginTop: 60, fontSize: 15, lineHeight: 22 },
  card: { backgroundColor: "#25253d", borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  topicBadge: {
    backgroundColor: "#6c5ce7",
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  date: { color: "#888", fontSize: 12 },
  questionText: { color: "#eee", fontSize: 14, lineHeight: 20 },
  answerText: { color: "#00cec9", fontSize: 14, fontWeight: "700", marginTop: 10 },
});
