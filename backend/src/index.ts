import "dotenv/config";
import { createApp } from "./app";

const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ MathApp backend http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`📚 API dokümantasyonu: http://localhost:${PORT}/docs`);
});
