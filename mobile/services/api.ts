import axios from "axios";
import * as SecureStore from "expo-secure-store";

// ÖNEMLİ: Telefonun ile bilgisayarın aynı WiFi ağında olmalı.
// Bilgisayarının yerel IP adresini (örn. 192.168.1.34) buraya yaz.
// Windows: cmd'de "ipconfig" -> IPv4 Address
// Mac: Terminal'de "ipconfig getifaddr en0"
export const API_BASE_URL = "http://192.168.1.105:3000";

const api = axios.create({ baseURL: API_BASE_URL });

async function getTokens() {
  const accessToken = await SecureStore.getItemAsync("accessToken");
  const refreshToken = await SecureStore.getItemAsync("refreshToken");
  return { accessToken, refreshToken };
}

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync("accessToken", accessToken);
  await SecureStore.setItemAsync("refreshToken", refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync("accessToken");
  await SecureStore.deleteItemAsync("refreshToken");
}

// Her isteğe otomatik olarak access token ekle
api.interceptors.request.use(async (config) => {
  const { accessToken } = await getTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 401 alınca otomatik olarak refresh token ile yenile ve isteği tekrar dene
let isRefreshing = false;
let pendingQueue: (() => void)[] = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Zaten bir yenileme sürüyorsa, sırada bekle
        await new Promise<void>((resolve) => pendingQueue.push(resolve));
        return api(originalRequest);
      }

      isRefreshing = true;
      try {
        const { refreshToken } = await getTokens();
        if (!refreshToken) throw new Error("Yenileme token'ı yok");

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        await saveTokens(data.accessToken, data.refreshToken);

        pendingQueue.forEach((resolve) => resolve());
        pendingQueue = [];

        return api(originalRequest);
      } catch (refreshErr) {
        await clearTokens();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
