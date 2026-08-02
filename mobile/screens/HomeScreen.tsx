import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import api, { clearTokens } from "../services/api";
import MathText from "../components/MathText";

interface Solution {
  id: string;
  question: string;
  topic: string;
  difficulty: string;
  solution_steps: string[];
  formulas: string[];
  final_answer: string;
}

export default function HomeScreen({ navigation }: any) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [solution, setSolution] = useState<Solution | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarQuestions, setSimilarQuestions] = useState<
    { question: string; solved: Solution | null; loading: boolean; expanded: boolean }[]
  >([]);

  function toggleStep(i: number) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function handleSolve() {
    if (question.trim().length < 3) return;
    setError("");
    setLoading(true);
    setSolution(null);
    setSimilarQuestions([]);
    try {
      const { data } = await api.post("/questions/solve", { question });
      setSolution(data);
      setExpandedSteps(new Set([0]));
    } catch (e: any) {
      setError(e.response?.data?.detail || "Soru çözülemedi. Bağlantını kontrol et.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSimilar() {
    if (!solution) return;
    setError("");
    setSimilarLoading(true);
    setSimilarQuestions([]);
    try {
      const { data } = await api.post("/questions/similar-batch", {
        referenceQuestion: solution.question,
        topic: solution.topic,
        difficulty: solution.difficulty,
        count: 4,
      });
      setSimilarQuestions(
        (data.questions as string[]).map((q) => ({ question: q, solved: null, loading: false, expanded: false }))
      );
    } catch (e: any) {
      setError(e.response?.data?.detail || "Benzer sorular üretilemedi.");
    } finally {
      setSimilarLoading(false);
    }
  }

  async function handleTapSimilarQuestion(index: number) {
    setSimilarQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], expanded: !copy[index].expanded };
      return copy;
    });

    const item = similarQuestions[index];
    if (item.solved || item.loading) return;

    setSimilarQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], loading: true };
      return copy;
    });

    try {
      const { data } = await api.post("/questions/solve", { question: item.question });
      setSimilarQuestions((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], solved: data, loading: false };
        return copy;
      });
    } catch (e) {
      setSimilarQuestions((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], loading: false };
        return copy;
      });
    }
  }

  async function extractFromImage(base64: string, uri: string) {
    setError("");
    setExtracting(true);
    setSolution(null);
    setPreviewImage(uri);
    try {
      const mediaType = uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      const { data } = await api.post("/questions/extract-image", {
        imageBase64: base64,
        mediaType,
      });
      setQuestion(data.extracted_text || "");
    } catch (e: any) {
      setError(e.response?.data?.detail || "Fotoğraftaki metin okunamadı.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Kamerayı kullanabilmek için izin vermelisin.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets[0].base64) {
      extractFromImage(result.assets[0].base64, result.assets[0].uri);
    }
  }

  async function handlePickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("İzin gerekli", "Galeriyi kullanabilmek için izin vermelisin.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, allowsEditing: true });
    if (!result.canceled && result.assets[0].base64) {
      extractFromImage(result.assets[0].base64, result.assets[0].uri);
    }
  }

  async function handleLogout() {
    await clearTokens();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Math Solva APP</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logout}>Çıkış</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navChip} onPress={() => navigation.navigate("Topics")}>
          <Text style={styles.navChipText}>📚 Konularım</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navChip} onPress={() => navigation.navigate("Search")}>
          <Text style={styles.navChipText}>🔍 Ara</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navChip} onPress={() => navigation.navigate("ExamSetup")}>
          <Text style={styles.navChipText}>⏱️ Sınav Ol</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Matematik sorunu yaz veya fotoğrafını at:</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Örn: x² - 5x + 6 = 0 denkleminin köklerini bulun"
        placeholderTextColor="#888"
        multiline
        numberOfLines={4}
        value={question}
        onChangeText={setQuestion}
        accessibilityLabel="Matematik sorusu giriş alanı"
      />
      {extracting && (
        <Text style={styles.extractingText}>📷 Fotoğraftaki soru okunuyor, birazdan yukarıdaki kutuda görünecek...</Text>
      )}

      <TouchableOpacity style={styles.solveButton} onPress={handleSolve} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.solveButtonText}>Yazıyla Çöz</Text>}
      </TouchableOpacity>

      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto} disabled={loading || extracting}>
          <Text style={styles.photoButtonText}>📷 Fotoğraf Çek</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={handlePickFromGallery} disabled={loading || extracting}>
          <Text style={styles.photoButtonText}>🖼️ Galeriden Seç</Text>
        </TouchableOpacity>
      </View>

      {previewImage && (
        <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {solution && (
        <View style={styles.solutionCard}>
          <View style={styles.badgeRow}>
            <Text style={styles.topicBadge}>{solution.topic}</Text>
            <Text style={styles.difficultyBadge}>{solution.difficulty}</Text>
          </View>

          <Text style={styles.sectionTitle}>Çözüm Adımları</Text>
          {solution.solution_steps.map((step, i) => {
            const expanded = expandedSteps.has(i);
            return (
              <View key={i} style={styles.stepCard}>
                <TouchableOpacity style={styles.stepHeader} onPress={() => toggleStep(i)}>
                  <Text style={styles.stepHeaderText}>Adım {i + 1}</Text>
                  <Text style={styles.stepToggle}>{expanded ? "▲" : "▼"}</Text>
                </TouchableOpacity>
                {expanded && (
                  <View style={styles.stepBody}>
                    <MathText content={step} />
                  </View>
                )}
              </View>
            );
          })}

          {solution.formulas.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Kullanılan Formüller</Text>
              {solution.formulas.map((f, i) => (
                <View key={i} style={styles.formulaRow}>
                  <MathText content={f} color="#dfe6e9" />
                </View>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Sonuç</Text>
          <MathText content={solution.final_answer} fontSize={18} color="#00cec9" />

          <TouchableOpacity style={styles.similarButton} onPress={handleSimilar} disabled={similarLoading}>
            {similarLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.similarButtonText}>🔁 Buna Benzer Sorular</Text>
            )}
          </TouchableOpacity>

          {similarQuestions.length > 0 && (
            <View style={styles.similarList}>
              {similarQuestions.map((item, i) => (
                <View key={i} style={styles.similarCard}>
                  <TouchableOpacity style={styles.similarCardHeader} onPress={() => handleTapSimilarQuestion(i)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.similarCardLabel}>Soru {i + 1}</Text>
                      <MathText content={item.question} fontSize={14} color="#eee" />
                    </View>
                    {item.loading ? (
                      <ActivityIndicator color="#a29bfe" size="small" />
                    ) : (
                      <Text style={styles.stepToggle}>{item.expanded ? "▲" : "▼"}</Text>
                    )}
                  </TouchableOpacity>

                  {item.expanded && item.solved && (
                    <View style={styles.similarCardBody}>
                      {item.solved.solution_steps.map((step, si) => (
                        <View key={si} style={{ marginBottom: 8 }}>
                          <Text style={styles.miniStepLabel}>Adım {si + 1}</Text>
                          <MathText content={step} fontSize={14} />
                        </View>
                      ))}
                      <Text style={styles.miniStepLabel}>Sonuç</Text>
                      <MathText content={item.solved.final_answer} fontSize={15} color="#00cec9" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  profileIcon: { fontSize: 22 },
  title: { fontSize: 22, fontWeight: "800", color: "#fff" },
  logout: { color: "#ff7675", fontSize: 14 },
  navRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  navChip: { backgroundColor: "#25253d", borderRadius: 20, paddingVertical: 10, paddingHorizontal: 16, marginRight: 10, marginBottom: 8 },
  navChipText: { color: "#fff", fontWeight: "600" },
  label: { color: "#ccc", marginBottom: 8, fontSize: 15 },
  textArea: {
    backgroundColor: "#25253d",
    color: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  extractingText: { color: "#a29bfe", fontSize: 13, marginTop: 8 },
  solveButton: { backgroundColor: "#6c5ce7", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 14 },
  solveButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  photoRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  photoButton: { flex: 1, backgroundColor: "#25253d", borderRadius: 12, padding: 14, alignItems: "center", marginRight: 10 },
  photoButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  previewImage: { width: "100%", height: 200, borderRadius: 12, marginTop: 16, backgroundColor: "#000" },
  error: { color: "#ff7675", marginTop: 12, textAlign: "center" },
  solutionCard: { backgroundColor: "#25253d", borderRadius: 16, padding: 20, marginTop: 24 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  topicBadge: {
    backgroundColor: "#6c5ce7",
    color: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 8,
    overflow: "hidden",
  },
  difficultyBadge: {
    backgroundColor: "#00b894",
    color: "#fff",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    fontSize: 12,
    fontWeight: "700",
    overflow: "hidden",
  },
  sectionTitle: { color: "#a29bfe", fontWeight: "700", fontSize: 15, marginTop: 14, marginBottom: 8 },
  stepCard: { backgroundColor: "#1a1a2e", borderRadius: 10, marginBottom: 8, overflow: "hidden" },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  stepHeaderText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  stepToggle: { color: "#a29bfe", fontSize: 12 },
  stepBody: { paddingHorizontal: 12, paddingBottom: 12 },
  formulaRow: { marginBottom: 6 },
  similarButton: {
    backgroundColor: "#00b894",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 20,
  },
  similarButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  similarList: { marginTop: 16 },
  similarCard: { backgroundColor: "#1a1a2e", borderRadius: 12, marginBottom: 10, overflow: "hidden" },
  similarCardHeader: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 8 },
  similarCardLabel: { color: "#a29bfe", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  similarCardBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: "#25253d", paddingTop: 10 },
  miniStepLabel: { color: "#888", fontSize: 11, fontWeight: "700", marginBottom: 2 },
});
