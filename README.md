<<<<<<< HEAD
# 9Router MIBP Version

A local AI routing gateway with provider fallback and token-saving features. This is a fork of [decolua/9router](https://github.com/decolua/9router).

## Installation

### Option 1: Docker

Pull the image:

```bash
docker pull mhiqrambhrng/9router-mibp-version:latest
```

Run the container:

```bash
mkdir -p 9router-data
docker run -d \
  --name 9router \
  -p 20128:20128 \
  -v 9router-data:/app/data \
  -e DATA_DIR=/app/data \
  -e PORT=20128 \
  -e HOSTNAME=0.0.0.0 \
  -e NODE_ENV=production \
  -e JWT_SECRET=<generate-with-openssl-rand-hex-32> \
  -e INITIAL_PASSWORD=<your-dashboard-password> \
  -e API_KEY_SECRET=<generate-with-openssl-rand-hex-32> \
  -e MACHINE_ID_SALT=<generate-with-openssl-rand-hex-32> \
  mhiqrambhrng/9router-mibp-version:latest
```

Or using Docker Compose (a `docker-compose.yml` is included in this repo):

```bash
cp .env.example .env   # fill in JWT_SECRET, INITIAL_PASSWORD, API_KEY_SECRET, MACHINE_ID_SALT
docker compose up -d
```

Dashboard opens at `http://localhost:20128/dashboard`.

### Option 2: Manual (from source)

Requirements: Node.js 22 or newer.

```bash
git clone https://github.com/mhiqrambg/9router-mibp-version.git
cd 9router-mibp-version

cp .env.example .env
# Edit .env: set JWT_SECRET, INITIAL_PASSWORD, API_KEY_SECRET, MACHINE_ID_SALT

npm install

# Development server
npm run dev

# Or production build
npm run build
npm run start
```

Dashboard opens at `http://localhost:20128/dashboard`.

## More Information

- Upstream project: [https://github.com/decolua/9router](https://github.com/decolua/9router)
- Upstream docs: [DOCKER.md](DOCKER.md) • [ARCHITECTURE.md](docs/ARCHITECTURE.md)
=======
<div align="center">

<img src="docs/images/urouter-icon.png" width="110" alt="Unlimited Router" />

# ∞ Unlimited Router

**Semua model AI. Satu pintu. Tanpa batas.**

Login banyak akun AI sekaligus — Unlimited Router memutar & mengganti akun otomatis
begitu salah satunya kena limit, jadi kamu tidak pernah kehabisan kuota.

[Instalasi untuk Windows](#-cara-install-di-windows-paling-gampang) · [Mac / Linux](#-cara-install-di-mac--linux) · [Panduan Pemakaian](#-panduan-pemakaian-5-menit) · [English](#-quick-start-english)

<img src="docs/images/dashboard.png" alt="Dashboard Unlimited Router" width="820" />

</div>

---

## ✨ Apa itu Unlimited Router?

Unlimited Router adalah **pintu gerbang AI pribadi** yang berjalan di komputermu sendiri:

- 🔓 **Multi-akun** — login dengan banyak akun Z.AI, Claude, GitHub Copilot, Qoder, Freebuff, Kimi, Gemini, dan 40+ penyedia lain. Semuanya aktif bersamaan.
- 🔄 **Rotasi otomatis** — kalau akun pertama kena limit (429/error), permintaan otomatis pindah ke akun berikutnya. Kamu tidak perlu melakukan apa-apa.
- 🖥️ **Satu alamat untuk semua tool** — Claude Code, Cline, RooCode, OpenCode, TRAE, dan tool AI lain tinggal diarahkan ke `http://localhost:20128`. Ganti penyedia tanpa mengubah setting tool-mu.
- 🏠 **100% lokal & gratis** — semua data (API key, akun, riwayat) tersimpan di komputermu. Tidak ada server pihak ketiga.
- 🌐 **Dua bahasa protokol** — bicara format Anthropic **dan** OpenAI sekaligus, jadi tool apa pun bisa terhubung.

> Intinya: seperti punya koneksi internet cadangan yang tidak pernah putus — tapi untuk AI.

---

## 📋 Yang Kamu Butuhkan

| Kebutuhan | Minimal | Cek punya atau tidak |
|---|---|---|
| **Node.js** | versi 20 atau lebih baru | Buka Command Prompt → ketik `node -v` → tekan Enter. Kalau muncul angka `v20.x` atau lebih, aman. |
| **Koneksi internet** | apa saja | Untuk unduh & ngobrol dengan AI |
| **Sistem operasi** | Windows 10/11, macOS, atau Linux | — |

> 💡 **Belum punya Node.js?** Buka [nodejs.org](https://nodejs.org) → klik tombol hijau besar **"LTS"** → next-next-next sampai selesai (seperti instal aplikasi biasa). Tidak perlu setting apa pun.

---

## 🪟 Cara Install di Windows (Paling Gampang)

### Langkah 1 — Unduh Unlimited Router

1. Klik tombol hijau **`<> Code`** di kanan atas halaman GitHub ini.
2. Pilih **`Download ZIP`**.
3. Klik kanan file ZIP yang terunduh → **Extract All...** → simpan di tempat favoritmu, misalnya `D:\UnlimitedRouter`.

### Langkah 2 — Jalankan Installer

1. Buka folder hasil extract.
2. **Klik dua kali file `Install-Windows.cmd`**
3. Jendela hitam (Command Prompt) akan muncul dan menginstall semuanya otomatis — tunggu sekitar 3–10 menit tergantung koneksi internet. Kopi dulu ☕
4. Ketika muncul tulisan **"Installation complete!"**, tekan tombol apa saja.

### Langkah 3 — Mulai Pakai!

1. Klik dua kali **`Start Unlimited Router.cmd`** di folder yang sama.
2. Ikon ∞ ungu akan muncul di *system tray* (pojok kanan bawah, dekat jam).
3. Browser akan terbuka otomatis ke `http://localhost:20128`.
4. Masukkan password default: **`123456`**
5. Selesai! Lanjut ke [Panduan Pemakaian](#-panduan-pemakaian-5-menit). 🎉

<details>
<summary>📺 Tampilan halaman login (klik untuk lihat)</summary>

<img src="docs/images/login-page.png" alt="Halaman login" width="720" />

</details>

---

## 🐧 Cara Install di Mac / Linux

Buka **Terminal**, lalu salin-tempel per baris:

```bash
# 1. Unduh dan masuk foldernya
git clone https://github.com/yusufsp7/unlimited-router.git
cd unlimited-router

# 2. Jalankan installer (mengunduh dependensi + build otomatis)
bash install-mac-linux.sh
```

Setelah selesai, jalankan dengan:

```bash
./start.sh
```

---

## 🚀 Panduan Pemakaian (5 Menit)

### 1. Masuk ke Dashboard

Buka browser → `http://localhost:20128` → password **`123456`**

> ⚠️ **Penting:** ganti password default! Kalau komputermu dipakai bersama orang lain, ini wajib. Pengaturan profil ada di menu (⋮) kanan atas dashboard.

### 2. Tambahkan Akun AI-mu

Klik **Providers** di menu kiri. Kamu akan melihat 40+ kartu penyedia AI.

**Contoh: menambah beberapa akun Z.AI sekaligus** 🔥

1. Klik kartu **Z.AI** → klik **Add Connection**.
2. Jendela browser akan terbuka ke halaman login Z.AI → login dengan akun pertamamu (bisa Google/Email/GitHub).
3. Setelah berhasil, akun pertama muncul di daftar.
4. **Klik Add Connection lagi** untuk akun kedua, ketiga, dan seterusnya — setiap akun jadi baris tersendiri.
5. Unlimited Router otomatis memakai akun secara bergantian. Kalau akun 1 limit → otomatis pindah ke akun 2 → dst.

Cara yang sama berlaku untuk penyedia lain (Claude, Qoder, Freebuff, Kimi, Copilot, ...). Untuk penyedia berbasis API key (misal AgentRouter, DeepSeek), cukup tempelkan API key-nya.

> ⚠️ **Catatan Z.AI**: kuota model GLM via API melekat pada **langganan aktif** akun (mis. GLM Coding Lite — cek di z.ai → langganan). Akun baru **belum** punya kuota API otomatis; aktifkan plan di akunmu dulu, atau pakai provider gratis lain (Freebuff, Kiro, Gemini CLI, NVIDIA NIM) — semuanya bisa masuk rotasi yang sama. Trik praktis: buat combo (halaman **Combo**) berisi beberapa provider untuk satu nama model, maka kalau satu sumber habis, otomatis pindah ke sumber berikutnya.

<details>
<summary>📺 Halaman Providers (klik untuk lihat)</summary>

<img src="docs/images/providers.png" alt="Halaman providers" width="720" />

</details>

### 3. Hubungkan Tool AI-mu

Ambil **API key** di halaman **Endpoint & Key** dashboard, lalu arahkan tool-mu ke:

| Pengaturan | Nilai |
|---|---|
| Base URL | `http://localhost:20128` (atau versi `/v1` sesuai tool) |
| API Key | key milikmu dari halaman Endpoint & Key |
| Model | pilih apa pun yang sudah kamu tambahkan (misal `zai/glm-5.2`) |

<details>
<summary>🛠️ Contoh: Claude Code</summary>

```bash
export ANTHROPIC_BASE_URL=http://localhost:20128
export ANTHROPIC_AUTH_TOKEN=sk-...key-dari-dashboard...
claude
```

</details>

<details>
<summary>🛠️ Contoh: Cline / RooCode (VS Code)</summary>

Di pengaturan ekstensi, isi:
- **API Provider:** OpenAI Compatible (atau Anthropic)
- **Base URL:** `http://localhost:20128/v1`
- **API Key:** key dari dashboard

</details>

Halaman **CLI Tools** di dashboard punya panduan siap-pakai untuk 15+ tool — tinggal klik tool-mu, semua disetel otomatis.

### 4. Pemakaian Sehari-hari

- **Tray icon ∞** (kanan bawah): klik kanan untuk buka dashboard, keluar, atau lihat status.
- **Tombol "Check Updates"** (menu ⋮): cek pembaruan versi langsung dari GitHub.
- **Usage / Quota Tracker**: pantau pemakaian tiap akun & model.
- Menutup browser **tidak** mematikan Unlimited Router — ia terus jalan di tray. Keluar lewat klik kanan ikon tray → **Quit**.

---

## ❓ FAQ (Pertanyaan Umum)

**Q: Apakah ini gratis?**
A: Ya, aplikasinya 100% gratis dan open source. Yang berbayar hanya kuota akun AI-mu sendiri (misal langganan Z.AI/Claude). Banyak penyedia gratis bawaan seperti Freebuff.

**Q: Apakah password dan akun saya aman?**
A: Semua data tersimpan di komputermu sendiri. Tidak dikirim ke mana pun selain ke penyedia AI saat dipakai.

**Q: Berapa banyak akun yang bisa ditambahkan?**
A: Tidak ada batas dari aplikasi. Praktiknya, gunakan secukupnya dan wajar sesuai ketentuan masing-masing penyedia.

**Q: Kok error "No active credentials"?**
A: Belum ada akun yang aktif untuk penyedia tsb — tambahkan dulu lewat halaman Providers.

**Q: Password kelupaan!**
A: Buka terminal di folder Unlimited Router → jalankan `urouter` → menu **Settings** → **Reset Password to Default** (kembali ke `123456`).

**Q: Bisa jalan otomatis saat komputer nyala?**
A: Bisa — installer Windows mendaftarkan Unlimited Router ke startup Windows. Matikan lewat Task Manager → tab *Startup* kalau tidak mau.

---

## 🔧 Troubleshooting

| Gejala | Solusi |
|---|---|
| `node -v` tidak dikenal | Node.js belum terinstall → [nodejs.org](https://nodejs.org) → unduh versi LTS |
| Port 20128 sudah dipakai | Ada aplikasi lain di port itu: `urouter --port 20129` |
| Dashboard tidak terbuka | Pastikan ikon ∞ ada di tray; kalau tidak, jalankan `Start Unlimited Router.cmd` lagi |
| Login Z.AI gagal | Session kedaluwarsa — hapus koneksi lama di halaman Z.AI lalu Add Connection ulang |
| Build error saat install | Hapus folder `node_modules` dan `.next`, lalu jalankan installer ulang |

Masih buntu? [Buka issue di GitHub](https://github.com/yusufsp7/unlimited-router/issues) — sertakan screenshot error-mu.

---

## 🇬🇧 Quick Start (English)

```bash
git clone https://github.com/yusufsp7/unlimited-router.git
cd unlimited-router
bash install-mac-linux.sh        # Windows: double-click Install-Windows.cmd
./start.sh                        # Windows: Start Unlimited Router.cmd
```

Open `http://localhost:20128` (default password `123456` — change it!), add provider
accounts under **Providers**, then point any OpenAI/Anthropic-compatible tool at
`http://localhost:20128`. Unlimited Router rotates all your accounts automatically.

---

## 🤝 Credits & License

Unlimited Router is an independent, heavily-modified fork of the open-source
[9Router](https://github.com/decolua/9router) family (including its community
MIBP edition with Freebuff support), reimagined with a new identity, multi-account
Z.AI login, AgentRouter support, and a fully redesigned UI.

- License: MIT (see [LICENSE](LICENSE))
- Tray icon & branding: ∞ Unlimited Router
- Made with 💜 for people who refuse to hit rate limits.
>>>>>>> release4
