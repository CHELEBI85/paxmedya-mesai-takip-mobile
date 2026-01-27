# Pax Medya Mesai Takip - Redux & Firebase Kurulum

## 📁 Yapı

```
src/
├── config/
│   └── firebase.js          # Firebase konfigürasyonu
├── store/
│   ├── store.js             # Redux Store
│   └── slices/
│       ├── authSlice.js     # Auth (Giriş/Kayıt)
│       └── databaseSlice.js # Database işlemleri
├── hooks/
│   ├── useAuth.js           # Auth hook
│   └── useDatabase.js       # Database hook
└── pages/
    ├── Home.js
    ├── Analysis.js
    └── Profile.js
```

## 🔥 Firebase Servisleri

✅ **Authentication** - Email/Password ile giriş ve kayıt
✅ **Firestore Database** - Mesai kayıtları saklama

## 🔴 Redux State Yapısı

### Auth State
```javascript
{
  user: { uid, email, ... } | null,
  loading: boolean,
  error: string | null,
  isAuthenticated: boolean
}
```

### Database State
```javascript
{
  records: [
    { id, userId, createdAt, ... }
  ],
  loading: boolean,
  error: string | null
}
```

## 📚 Kullanım Örnekleri

### Auth Kullanımı
```javascript
import { useAuth } from '../hooks/useAuth';

function LoginScreen() {
  const { login, loading, error, isAuthenticated } = useAuth();
  
  const handleLogin = async () => {
    await login('email@example.com', 'password');
  };
  
  return (
    // Component JSX
  );
}
```

### Database Kullanımı
```javascript
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';

function WorkRecords() {
  const { user } = useAuth();
  const { records, loading, addRecord } = useDatabase();
  
  useEffect(() => {
    getWorkRecords(user.uid);
  }, [user]);
  
  const handleAddRecord = async () => {
    await addRecord(user.uid, {
      startTime: new Date(),
      location: 'İstanbul'
    });
  };
  
  return (
    // Component JSX
  );
}
```

## 🎯 Async Actions

### Auth Actions
- `loginUser(email, password)` - Giriş yap
- `registerUser(email, password)` - Kayıt ol
- `logoutUser()` - Çıkış yap

### Database Actions
- `fetchWorkRecords(userId)` - Kayıtları getir
- `addWorkRecord(userId, data)` - Kayıt ekle
- `updateWorkRecord(recordId, data)` - Kayıt güncelle
- `deleteWorkRecord(recordId)` - Kayıt sil

## 📦 Kurulum

```bash
npm install
npm start
```

## ⚙️ Sonraki Adımlar

1. Login sayfası oluştur
2. Auth guard ekle (Protected Routes)
3. Mesai giriş/çıkış özelliği
4. Analiz grafikleri
5. Profil yönetimi
