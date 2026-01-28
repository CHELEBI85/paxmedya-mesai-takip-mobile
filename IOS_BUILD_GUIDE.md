# iOS Build Rehberi

## Gereksinimler

### 1. Xcode Kurulumu
- Mac App Store'dan **Xcode**'u indirin ve kurun
- Xcode açıldığında lisans sözleşmesini kabul edin
- Xcode > Settings > Locations > Command Line Tools: Xcode versiyonunu seçin

### 2. CocoaPods Kurulumu
Terminal'de çalıştırın:
```bash
sudo gem install cocoapods
```

### 3. iOS Native Klasörü Oluşturma
Proje klasöründe:
```bash
npx expo prebuild --platform ios --clean
```

Bu komut `ios/` klasörünü oluşturur.

### 4. CocoaPods Dependencies Yükleme
```bash
cd ios
pod install
cd ..
```

## Build Alma

### Simülatör için Test:
```bash
npm run ios
```
veya
```bash
npx expo run:ios
```

### Gerçek Cihaz için Build:

#### Seçenek 1: Xcode ile (Önerilen)
1. Xcode'u açın:
   ```bash
   open ios/paxmedya-mesai-takip.xcworkspace
   ```
   ⚠️ **ÖNEMLİ**: `.xcworkspace` dosyasını açın, `.xcodeproj` değil!

2. Xcode'da:
   - Sol üstten **hedef cihazı** seçin (iPhone simülatör veya bağlı cihaz)
   - **Signing & Capabilities** sekmesine gidin
   - **Team** seçin (Apple Developer hesabınız)
   - **Bundle Identifier** kontrol edin: `com.paxmedya.mesaitakip`
   - **Product > Archive** (gerçek cihaz için) veya **Product > Run** (simülatör için)

#### Seçenek 2: Terminal ile
```bash
npx expo run:ios --device
```

## Önemli Notlar

1. **Apple Developer Hesabı**: Gerçek cihazda test için Apple Developer hesabı gerekli (ücretsiz hesap yeterli, 7 günlük sertifika)

2. **Location Permissions**: iOS için location izinleri `app.json`'da zaten yapılandırılmış:
   - `NSLocationWhenInUseUsageDescription`
   - `NSLocationAlwaysUsageDescription`

3. **WebView**: `react-native-webview` iOS'ta otomatik çalışır, ekstra yapılandırma gerekmez.

4. **Build Hatası Alırsanız**:
   - `cd ios && pod install && cd ..` tekrar çalıştırın
   - Xcode'da **Product > Clean Build Folder** (Cmd+Shift+K)
   - `npx expo prebuild --platform ios --clean` tekrar çalıştırın

## IPA Dosyası Oluşturma (App Store için)

1. Xcode'da **Product > Archive**
2. **Window > Organizer** açılır
3. Archive'ı seçin ve **Distribute App** butonuna tıklayın
4. Dağıtım yöntemini seçin (App Store, Ad Hoc, vb.)
