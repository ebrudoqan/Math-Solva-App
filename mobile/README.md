# MathApp Mobile (Expo / React Native)

## Kurulum

1. Önce **backend'i çalıştır** (bkz. `../backend/README.md`) — çünkü mobil uygulama
   verileri oradan alıyor.

2. `mobile` klasöründe terminal aç:
   ```
   npm install
   ```

3. `services/api.ts` dosyasını aç, `API_BASE_URL` değerini bilgisayarının yerel
   IP adresiyle güncelle (örn. `http://192.168.1.34:3000`). `localhost` yazarsan
   telefon bunu kendi üzerinde arar, bilgisayarına ulaşamaz — bu yüzden gerçek
   IP adresi şart.

4. Telefonuna **Expo Go** uygulamasını indir (App Store / Play Store, ücretsiz).

5. Şunu çalıştır:
   ```
   npx expo start
   ```

6. Terminalde çıkan QR kodu telefonundaki Expo Go uygulamasıyla okut
   (Android: Expo Go içinden "Scan QR Code"; iPhone: kamera uygulamasıyla okutup
   Expo Go'da açabilirsin).

7. Telefonun ile bilgisayarın **aynı WiFi ağına bağlı** olmalı, yoksa bağlantı
   kurulamaz.

## Uygulama Akışı

- Giriş yap / Kayıt ol
- Ana sayfada bir matematik sorusu yaz → "Çöz" → adım adım çözüm, formüller,
  sonuç ekranda gösterilir
- "Konularım" ekranı: sorduğun tüm sorulara göre otomatik oluşan konu listesi
- "Sınav Ol" ekranı: bir veya birden fazla konu + süre (dakika) seç → zamanlı
  sınav başlar → süre dolunca veya "Sınavı Bitir" dediğinde puanın ve doğru
  cevaplar gösterilir

## Sorun mu yaşıyorsun?

- "Network Error" alıyorsan: `API_BASE_URL` yanlış IP olabilir, ya da backend
  çalışmıyor olabilir, ya da telefon+bilgisayar farklı WiFi'da olabilir.
- Backend'de `ANTHROPIC_API_KEY` eksikse soru çözme ve sınav oluşturma
  çalışmaz (401/502 hatası alırsın) — kimlik doğrulama (giriş/kayıt) yine de
  çalışır çünkü o AI kullanmaz.
