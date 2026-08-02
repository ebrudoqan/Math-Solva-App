import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

// Arka planda uçuşan matematik sembolleri
const SYMBOLS = ["∑", "π", "√", "∞", "±", "÷", "×", "∫", "θ", "Δ", "≈", "%"];

interface FloatingSymbol {
  symbol: string;
  left: number;
  top: number;
  size: number;
  opacity: number;
}

function generateSymbols(count: number): FloatingSymbol[] {
  return Array.from({ length: count }).map((_, i) => ({
    symbol: SYMBOLS[i % SYMBOLS.length],
    left: Math.random() * (width - 40),
    top: Math.random() * 700,
    size: 24 + Math.random() * 28,
    opacity: 0.08 + Math.random() * 0.15,
  }));
}

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const symbols = useRef(generateSymbols(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        onFinish();
      });
    }, 1600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {symbols.map((s, i) => (
        <Text
          key={i}
          style={[
            styles.floatingSymbol,
            { left: s.left, top: s.top, fontSize: s.size, opacity: s.opacity },
          ]}
        >
          {s.symbol}
        </Text>
      ))}

      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: "center" }}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoSymbol}>∑</Text>
        </View>
        <Text style={styles.title}>Math Solva APP</Text>
        <Text style={styles.subtitle}>Sorularını yapay zeka ile çöz</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    overflow: "hidden",
  },
  floatingSymbol: { position: "absolute", color: "#a29bfe", fontWeight: "700" },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#6c5ce7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoSymbol: { fontSize: 44, color: "#fff", fontWeight: "800" },
  title: { fontSize: 28, fontWeight: "800", color: "#fff" },
  subtitle: { fontSize: 14, color: "#a29bfe", marginTop: 6 },
});
