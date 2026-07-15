# PlanTim - HTTPS Setup za Lokalni Razvoj

## 📋 Pregled

Ovo uputstvo objašnjava kako konfigurisati HTTPS za lokalni razvoj PlanTim aplikacije koristeći `https://localhost:5173`.

## 🚀 Brzi Start

### Korak 1: Pokrenite Setup Skriptu

```bash
SETUP_HTTPS.bat
```

Ova skripta će:
- Instalirati `mkcert` (ako nije instaliran)
- Instalirati lokalni Certificate Authority (CA)
- Kreirati SSL sertifikate za localhost
- Instalirati sertifikate u sistem

### Korak 2: Vite Config je već konfigurisan

`frontend/vite.config.ts` je već konfigurisan da koristi HTTPS sertifikate ako postoje u `frontend/certs/` folderu.

### Korak 3: Restartujte Frontend Server

Zaustavite trenutni server (Ctrl+C) i pokrenite ponovo:

```bash
cd frontend
npm run dev
```

### Korak 4: Otvorite Aplikaciju

Idite na: `https://localhost:5173`

## ⚠️ Browser Upozorenje

Prvi put kada otvorite `https://localhost:5173`, browser će prikazati upozorenje o sertifikatu jer je samopotpisani. To je normalno za lokalni razvoj.

**Da nastavite:**
1. Kliknite na "Advanced" ili "Napredno"
2. Kliknite na "Proceed to localhost (unsafe)" ili "Nastavi na localhost (nesigurno)"

Nakon ovoga, sertifikat će biti poveren i nećete više videti upozorenje.

## 🔧 Ručna Instalacija

Ako želite da uradite ovo ručno:

### 1. Instalirajte mkcert

```bash
npm install -g mkcert
```

### 2. Instalirajte lokalni CA

```bash
mkcert -install
```

Ovo dodaje `mkcert` CA u vaš sistem kao pouzdan izvor sertifikata.

### 3. Kreirajte certs direktorijum

```bash
cd frontend
mkdir certs
```

### 4. Generišite sertifikate

```bash
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost-cert.pem localhost 127.0.0.1 ::1
```

Ovo kreira:
- `certs/localhost-key.pem` - Privatni ključ
- `certs/localhost-cert.pem` - Sertifikat

## 📁 Struktura Fajlova

```
frontend/
├── certs/
│   ├── localhost-key.pem
│   └── localhost-cert.pem
├── vite.config.ts
└── ...
```

## 🔄 Vraćanje na HTTP

Ako želite da se vratite na HTTP:

1. **Opcija 1:** Obrišite `certs` folder - Vite će automatski koristiti HTTP
   ```bash
   rmdir /s frontend\certs
   ```

2. **Opcija 2:** Ručno ažurirajte `vite.config.ts` - uklonite `https` opciju iz `server` sekcije

## 🔍 Provera HTTPS-a

Nakon pokretanja servera, u browser-u:

1. Kliknite na ikonu zaključanog lokota u address baru
2. Kliknite na "Certificate" ili "Sertifikat"
3. Trebalo bi da vidite:
   - **Issued to:** localhost
   - **Issued by:** mkcert development CA

## 🐛 Troubleshooting

### Problem: "mkcert is not recognized"

**Rešenje:**
```bash
npm install -g mkcert
```

Možda treba da restartujete terminal nakon instalacije.

### Problem: "Permission denied" pri instalaciji CA

**Rešenje:**
Pokrenite Command Prompt kao Administrator i pokrenite:
```bash
mkcert -install
```

### Problem: Browser i dalje prikazuje upozorenje

**Rešenje:**
1. Proverite da li je mkcert CA instaliran: `mkcert -install`
2. Očistite browser cache
3. Restartujte browser

### Problem: "Cannot find module 'fs'"

**Rešenje:**
`fs` je Node.js built-in modul. Ako dobijate ovu grešku, proverite da koristite Node.js verziju 14 ili noviju.

### Problem: Sertifikati se ne učitavaju

**Rešenje:**
1. Proverite da li fajlovi postoje: `dir frontend\certs`
2. Proverite da li su putanje u `vite.config.ts` tačne
3. Restartujte Vite server

## 📚 Dodatne Informacije

### mkcert

`mkcert` je alat za kreiranje lokalnih SSL sertifikata koji su automatski povereni od strane browsera nakon instalacije CA-a.

Više informacija: https://github.com/FiloSottile/mkcert

### Vite HTTPS

Vite podržava HTTPS kroz Node.js `https` modul. Više informacija: https://vitejs.dev/config/server-options.html#server-https

## 🔐 Bezbednost

**VAŽNO:** Ovi sertifikati su samo za lokalni razvoj! NIKADA ih ne koristite u produkciji!

Za produkciju, koristite prave SSL sertifikate od pouzdanog CA-a (npr. Let's Encrypt, Cloudflare, itd.).











