import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";

interface Topic {
  topic: string;
  question_count: number;
  last_asked: string;
}

export default function TopicsScreen({ navigation }: any) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      api
        .get("/questions/topics")
        .then(({ data }) => active && setTopics(data))
        .catch(() => {})
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Konularım</Text>
      <Text style={styles.subtitle}>Sorduğun sorulara göre otomatik oluşan konu listesi</Text>

      {loading ? (
        <ActivityIndicator color="#6c5ce7" style={{ marginTop: 40 }} />
      ) : topics.length === 0 ? (
        <Text style={styles.empty}>Henüz hiç soru sormadın. Ana sayfadan bir soru sorarak başla!</Text>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(t) => t.topic}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("ExamSetup", { preselectTopic: item.topic })}
            >
              <View>
                <Text style={styles.topicName}>{item.topic}</Text>
                <Text style={styles.topicMeta}>{item.question_count} soru çözüldü</Text>
              </View>
              <Text style={styles.arrow}>Sınav ol →</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e", padding: 20 },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", marginBottom: 4 },
  subtitle: { color: "#aaa", marginBottom: 20 },
  empty: { color: "#aaa", textAlign: "center", marginTop: 60, fontSize: 15, lineHeight: 22 },
  card: {
    backgroundColor: "#25253d",
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topicName: { color: "#fff", fontSize: 17, fontWeight: "700" },
  topicMeta: { color: "#aaa", fontSize: 13, marginTop: 4 },
  arrow: { color: "#a29bfe", fontSize: 13, fontWeight: "600" },
});
