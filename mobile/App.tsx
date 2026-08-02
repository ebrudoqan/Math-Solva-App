import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";

import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import TopicsScreen from "./screens/TopicsScreen";
import SearchScreen from "./screens/SearchScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ExamSetupScreen from "./screens/ExamSetupScreen";
import ExamScreen from "./screens/ExamScreen";
import ExamResultScreen from "./screens/ExamResultScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync("accessToken").then((token) => {
      setInitialRoute(token ? "Home" : "Login");
    });
  }, []);

  if (showSplash || !initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
        {initialRoute ? (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        ) : (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator color="#6c5ce7" size="large" />
          </View>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Topics" component={TopicsScreen} options={{ headerShown: true, title: "Konularım" }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: true, title: "Ara" }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: "Profilim" }} />
        <Stack.Screen
          name="ExamSetup"
          component={ExamSetupScreen}
          options={{ headerShown: true, title: "Sınav Ayarları" }}
        />
        <Stack.Screen name="Exam" component={ExamScreen} options={{ headerShown: true, title: "Sınav" }} />
        <Stack.Screen
          name="ExamResult"
          component={ExamResultScreen}
          options={{ headerShown: true, title: "Sonuç" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
