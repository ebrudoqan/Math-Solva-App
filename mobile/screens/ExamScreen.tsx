import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import api from "../services/api";
import MathText from "../components/MathText";

export default function ExamScreen({ navigation, route }: any) {
  const { exam } = route.params; // { examId, durationMinutes, endsAt, questions }
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, Math.floor((new Date(exam.endsAt).getTime() - Date.now()) / 1000))
  );
  const submittedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  async function handleSubmit(auto = false) {
    if (submittedRef.current) return;
    submittedRef.current = true;

    const answersPayload = Object.entries(answers).map(([index, answer]) => ({
      index: Number(index),
      answer,
    }));

    try {
      const { data } = await api.post(`/exam/${exam.examId}/submit`, { answers: answersPayload });
      navigation.replace("ExamResult", { result: data, auto });
    } catch (e) {
      Alert.alert("Hata", "Sınav gönderilemedi. Bağlantını kontrol et.");
      submittedRef.current = false;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.timerBar}>
        <Text style={styles.timerText}>⏱ {formatTime(secondsLeft)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {exam.questions.map((q: any) => (
          <View key={q.index} style={styles.questionCard}>
            <Text style={styles.questionNumber}>Soru {q.index + 1}</Text>
            <View style={{ marginBottom: 12 }}>
              <MathText content={q.question_text} fontSize={16} color="#fff" />
            </View>
            <TextInput
              style={styles.answerInput}
              placeholder="Cevabını yaz"
              placeholderTextColor="#888"
              value={answers[q.index] || ""}
              onChangeText={(v) => setAnswers((a) => ({ ...a, [q.index]: v }))}
            />
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.submitButton} onPress={() => handleSubmit(false)}>
        <Text style={styles.submitButtonText}>Sınavı Bitir</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  timerBar: { backgroundColor: "#25253d", padding: 16, alignItems: "center" },
  timerText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  questionCard: { backgroundColor: "#25253d", borderRadius: 14, padding: 18, marginBottom: 16 },
  questionNumber: { color: "#a29bfe", fontWeight: "700", marginBottom: 6 },
  questionText: { color: "#fff", fontSize: 16, marginBottom: 12, lineHeight: 22 },
  answerInput: { backgroundColor: "#1a1a2e", color: "#fff", borderRadius: 10, padding: 12, fontSize: 15 },
  submitButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#6c5ce7",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
  },
  submitButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
