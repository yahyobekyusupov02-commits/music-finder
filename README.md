# 🎵 MusicFinder - Web & PocketBase API

MusicFinder veb-sayti uchun to'liq integratsiya qilingan PocketBase API va Docker infratuzilmasi.

---

## 🚀 Loyiha arxitekturasi

Loyiha ikkita mustaqil Docker konteyneridan iborat:
1. **`pocketbase` (`music-finder-pocketbase`)**:
   - Backend API, ma'lumotlar bazasi (SQLite) va Admin panel
   - Ichki port: `8090`, tashqi port: `8091` (sozlanadi)
   - Avtomatik migratsiyalar (`pb_migrations`) orqali kolleksiyalar va boshlang'ich ma'lumotlar avtomatik yuklanadi
   - Superuser avtomatik yaratiladi

2. **`website` (`music-finder-web`)**:
   - Nginx serverida ishlovchi frontend veb-sayt
   - Port: `8080` (sozlanadi)
   - Nginx teskari proksi (reverse proxy) orqali `/api/` va `/_/` (admin) so'rovlarini PocketBase'ga yo'naltiradi (CORS muammosisiz ishlaydi)
   - Real-time audio pleyer, qidiruv, ijodkorlar va sevimlilar tizimi

---

## 📁 Fayllar tuzilmasi

```text
music-finder/
├── docker-compose.yml          # Konteynerlarni birgalikda ishga tushirish
├── Dockerfile                  # Veb-sayt uchun Nginx Dockerfile
├── Dockerfile.pocketbase       # PocketBase uchun Dockerfile
├── nginx.conf                  # Nginx teskari proksi va statik fayllar sozlamasi
├── .env                        # Muhit o'zgaruvchilari (portlar, admin login)
├── .env.example                # Namuna sozlamalar
├── index.html                  # Veb-sayt interfeysi
├── style.css                   # Dizayn va animatsiyalar
├── script.js                   # PocketBase API integratsiyasi va audio pleyer
└── pocketbase/
    ├── pb_migrations/
    │   ├── 1710000001_initial_schema.js  # DB kolleksiyalari sxemasi
    │   └── 1710000002_seed_data.js       # Boshlang'ich musiqalar va ijodkorlar
    ├── entrypoint.sh           # Migratsiya va superuser yaratuvchi skript
    └── pb_data/                # Ma'lumotlar bazasi saqlanadigan joy (persist)
```

---

## 🛠 Ishga tushirish (Docker orqali)

### 1. Konteynerlarni ishga tushirish:
```bash
docker compose up -d --build
```

### 2. Havolalar:
- **Veb-sayt**: [http://localhost:8080](http://localhost:8080)
- **PocketBase Admin Dashboard**: [http://localhost:8091/_/](http://localhost:8091/_/) (yoki [http://localhost:8080/_/](http://localhost:8080/_/))
- **PocketBase API**: [http://localhost:8091/api/](http://localhost:8091/api/) (yoki [http://localhost:8080/api/](http://localhost:8080/api/))

### 3. Standart Superuser (Admin) hisobi:
- **Email**: `admin@musicfinder.com`
- **Parol**: `admin123456`

*(Ushbu ma'lumotlarni `.env` fayli orqali o'zgartirishingiz mumkin)*

### 4. Konteynerlarni to'xtatish:
```bash
docker compose down
```

---

## 🗄 PocketBase API & Ma'lumotlar bazasi (Collections)

### 1. `artists` (Ijodkorlar)
| Maydon | Turi | Tavsif |
|---|---|---|
| `name` | text (required) | Ijodkor ismi (masalan: "The Weeknd") |
| `bio` | text | Biografiyasi |
| `genre` | text | Janri (masalan: "R&B / Synth-pop") |
| `avatar_class` | text | CSS klassi (`artist-one`, `artist-two`, h.k.) |
| `avatar_symbol` | text | Ikonka belgisi (`♫`, `★`, `⚡`, `♬`) |
| `monthly_listeners` | number | Oylik tinglovchilar soni |

- **API Ro'yxat**: `GET /api/collections/artists/records?sort=-monthly_listeners`

---

### 2. `songs` (Qo'shiqlar / Treklar)
| Maydon | Turi | Tavsif |
|---|---|---|
| `title` | text (required) | Qo'shiq nomi |
| `artist` | relation (`artists`) | Ijodkor bilan bog'lanish |
| `artist_name` | text (required) | Ijodkor nomi |
| `duration` | text | Davomiyligi (masalan: "3:20") |
| `cover_class` | text | CSS klassi (`cover-one`, `cover-two`, h.k.) |
| `cover_number` | text | Trek raqami (`01`, `02`, h.k.) |
| `audio_url` | text | Jonli ijro etiladigan audio havolasi (MP3) |
| `is_trending` | bool | Trenddalik holati |
| `plays` | number | Tinglashlar soni |
| `likes` | number | Yoqtirishlar soni |
| `tags` | text | Qidiruv teglari |

- **API Ro'yxat**: `GET /api/collections/songs/records?expand=artist`
- **Trenddagi treklar**: `GET /api/collections/songs/records?filter=(is_trending=true)&expand=artist`
- **Qidiruv**: `GET /api/collections/songs/records?filter=(title~'soz' || artist_name~'soz')`

---

### 3. `popular_searches` (Mashhur qidiruvlar)
| Maydon | Turi | Tavsif |
|---|---|---|
| `query` | text (required) | Qidiruv so'zi |
| `search_count` | number | Qidirilganlar soni |

- **API Ro'yxat**: `GET /api/collections/popular_searches/records?sort=-search_count`

---

### 4. `favorites` (Sevimlilar)
| Maydon | Turi | Tavsif |
|---|---|---|
| `user` | relation (`users`) | Foydalanuvchi IDsi |
| `song` | relation (`songs`) | Qo'shiq IDsi |

- **Qo'shish**: `POST /api/collections/favorites/records` (Auth token bilan)
- **O'chirish**: `DELETE /api/collections/favorites/records/:id`

---

### 5. `users` (Foydalanuvchilar)
- PocketBase o'rnatilgan autentifikatsiya kolleksiyasi
- **Kirish**: `POST /api/collections/users/auth-with-password`
- **Ro'yxatdan o'tish**: `POST /api/collections/users/records`

---

## 🎧 Veb-sayt xususiyatlari

- **Jonli musiqa pleyeri**:
  - Play / Pause boshqaruvi
  - Oldingi / Keyingi trekka o'tish
  - Trek vaqtini interaktiv o'tkazish (seek bar)
  - Ovozni yoqish / o'chirish (mute)
  - Trek tugaganda avtomatik keyingisiga o'tish
  - Tinglashlar sonini PocketBase'da avtomatik oshirish
- **Dinamik qidiruv**:
  - Qidiruv satri orqali trek yoki ijodkorni real-vaqtda topish
  - Mashhur qidiruv tugmalari orqali 1-bosishda filtrlash
- **Ijodkorlar bo'limi**:
  - Ijodkor kartochkasiga bosganda uning barcha treklari filtrlanadi
- **Sevimlilar tizimi**:
  - Yurakcha (heart) bosilganda PocketBase yoki localStorage'ga saqlash
  - "Sevimlilarni ko'rish" tugmasi orqali yoqtirilgan treklarni alohida ko'rish
- **Foydalanuvchi hisobi (Auth Modal)**:
  - Saytning o'zida zamonaviy modal orqali Kirish va Ro'yxatdan o'tish
  - Kirgandan so'ng foydalanuvchi ismi va chiqish tugmasi
