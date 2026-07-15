# 🚀 Upravljanje Korisnicima - Brzo Uputstvo

## 📍 Pristup Modulu

1. Prijavite se kao **Admin** ili **Super Admin**
2. Kliknite na **"Admin"** u navigaciji
3. Kliknite na karticu **"Upravljanje Korisnicima"**

### Kredencijali za Testiranje:
```
Email:    admin@plantim.com
Lozinka: password
```

---

## ✨ Brzi Start

### 1. Kreiranje Novog Korisnika

**Koraci:**
```
1. Kliknite dugme "Novi Korisnik" (gore desno)
2. Popunite formu:
   ✓ Ime i Prezime *
   ✓ Email Adresa *
   ✓ Lozinka * (min 8 karaktera)
   ✓ Telefon (opciono)
   ✓ Uloga * (employee, manager, admin, super-admin)
   ✓ Aktivan Nalog (checkbox)
3. Kliknite "Kreiraj Korisnika"
4. ✅ Uspeh! Korisnik je kreiran
```

**Primer:**
```
Ime: Marko Marković
Email: marko@plantim.com
Lozinka: SecurePass123
Telefon: +387 66 123 456
Uloga: employee
Status: ✓ Aktivan
```

---

### 2. Pretraga Korisnika

**Search Bar:**
- Unesite ime ili email
- Real-time pretraga (nakon 300ms)
- Highlight rezultata

**Primeri:**
```
Pretraga: "marko"     → Pronalazi: Marko Marković
Pretraga: "@gmail"    → Pronalazi sve Gmail korisnike
Pretraga: "admin"     → Pronalazi korisnike sa "admin" u imenu ili emailu
```

---

### 3. Filtriranje

**Kliknite "Filteri" dugme:**

**Status Filter:**
- Svi
- Samo Aktivni
- Samo Neaktivni

**Uloga Filter:**
- Sve Uloge
- Super Admin
- Admin
- Manager
- Employee

**Sortiranje:**
- Najnoviji Prvo ⬇️
- Najstariji Prvo ⬆️
- Ime (A-Z)
- Ime (Z-A)
- Poslednja Prijava (Najnovija)
- Poslednja Prijava (Najstarija)

---

### 4. Uređivanje Korisnika

**Koraci:**
```
1. Pronađite korisnika u tabeli
2. Kliknite žutu ikonu (Edit) ✏️
3. Izmenite potrebne informacije
4. Lozinka - ostavite prazno za zadržavanje postojeće
5. Kliknite "Ažuriraj Korisnika"
6. ✅ Promene sačuvane!
```

---

### 5. Aktivacija / Deaktivacija

**Brza Metoda:**
```
1. Pronađite korisnika
2. Kliknite na status badge (Aktivan/Neaktivan)
3. Status se odmah menja
4. ✅ Toast notifikacija
```

**Zašto deaktivirati?**
- Zaposleni napustio kompaniju
- Privremena suspenzija
- Security razlozi
- Deaktivirani korisnici NE MOGU pristupiti sistemu

---

### 6. Dodela Uloga

**Koraci:**
```
1. Kliknite ljubičastu ikonu (Shield) 🛡️
2. Otvara se modal sa trenutnom ulogom
3. Izaberite novu ulogu iz dropdown-a
4. Vidite listu dozvola za tu ulogu
5. Kliknite "Dodeli Ulogu"
6. ✅ Uloga dodeljena!
```

**Dostupne Uloge:**
- **Super Admin** - Potpun pristup
- **Admin** - Administratorski pristup
- **Manager** - Upravljanje timom
- **Employee** - Standardan pristup
- **User** - Bazni pristup

---

### 7. Detaljni Pregled Korisnika

**Koraci:**
```
1. Kliknite plavu ikonu (Eye) 👁️
2. Otvara se detaljan modal
```

**Tab: Osnovne Informacije**
- Email, telefon, ID
- Uloga
- Datum kreiranja
- Poslednja prijava
- Status

**Tab: Aktivnost**
- Log aktivnosti
- Istorija prijava
- IP adrese
- Timestamp-ovi

**Tab: Dozvole**
- Sve dozvole korisnika
- Grupisano po modulima
- Vizuelni prikaz

---

### 8. Brisanje Korisnika

**Koraci:**
```
1. Kliknite crvenu ikonu (Trash) 🗑️
2. Potvrda: "Da li ste sigurni?"
3. Kliknite "OK"
4. ✅ Korisnik obrisan!
```

**⚠️ VAŽNO:**
- Ne možete obrisati sopstveni nalog
- Brisanje je trajno (trenutno nema soft delete)
- Razmislite pre brisanja!

---

### 9. Masovne Akcije (Bulk Actions)

**Selekcija:**
```
1. Kliknite checkbox pored svakog korisnika
   ILI
2. Kliknite checkbox u header-u za "Select All"
3. Prikazuje se Floating Action Bar na dnu
```

**Dostupne Akcije:**
- ✅ **Aktiviraj** - Aktivira sve selektovane
- ⚠️ **Deaktiviraj** - Deaktivira sve selektovane
- 🗑️ **Obriši** - Briše sve selektovane
- ❌ **Otkaži** - Poništava selekciju

**Primer:**
```
Scenario: Brisanje svih test korisnika

1. U search unesite "test"
2. Select All
3. Kliknite "Obriši"
4. Potvrda: "Obrisati 5 korisnika?"
5. OK
6. ✅ Svi test korisnici obrisani!
```

---

## 📊 Statistike

**Dashboard prikazuje:**

| Metrika | Opis |
|---------|------|
| **Ukupno Korisnika** | Svi korisnici u sistemu |
| **Aktivni** | Korisnici sa aktivnim nalogom |
| **Neaktivni** | Deaktivirani korisnici |
| **Novi (Mesec)** | Novi korisnici ovog meseca |

---

## 🎯 Česti Slučajevi Upotrebe

### 1. Novi Zaposleni
```
HR Manager dodaje novog zaposlenog:
→ Novi Korisnik
→ Popuni informacije
→ Dodeli ulogu "Employee"
→ Kreiraj
→ Pošalji kredencijale zaposlenom
```

### 2. Promocija Zaposlenog
```
Zaposleni postaje Manager:
→ Pronađi korisnika
→ Dodeli Ulogu
→ Izaberi "Manager"
→ Dodeli
→ Korisnik dobija manager dozvole
```

### 3. Zaposleni Napustio Kompaniju
```
→ Pronađi korisnika
→ Klikni na "Aktivan" badge
→ Status postaje "Neaktivan"
→ Korisnik ne može pristupiti sistemu
```

### 4. Čišćenje Test Korisnika
```
→ Pretraži "test"
→ Select All
→ Bulk Delete
→ Potvrdi
→ Svi test korisnici obrisani
```

---

## 🎨 UI Elementi

### Ikone i Njihovo Značenje

| Ikona | Akcija | Boja |
|-------|--------|------|
| 👁️ | Pregled | Plava |
| ✏️ | Uredi | Žuta |
| 🛡️ | Dodeli Ulogu | Ljubičasta |
| 🗑️ | Obriši | Crvena |

### Status Badge-ovi

| Badge | Značenje | Klik Akcija |
|-------|----------|-------------|
| 🟢 Aktivan | Korisnik može pristupiti | → Deaktivira |
| 🔴 Neaktivan | Korisnik NE MOŽE pristupiti | → Aktivira |

---

## ⌨️ Keyboard Shortcuts (Planirano)

| Prečica | Akcija |
|---------|--------|
| `Ctrl + N` | Novi Korisnik |
| `Ctrl + F` | Focus na Search |
| `Ctrl + A` | Select All |
| `Escape` | Zatvori Modal |
| `Enter` | Submit Form |

---

## 📱 Mobilna Verzija

**Responsive Design:**
- ✅ Sve funkcionalnosti dostupne
- ✅ Touch-friendly dugmići
- ✅ Full-screen modali
- ✅ Optimizovana tabela
- ✅ Hamburger menu za akcije

---

## ❌ Česte Greške

### "Email već postoji"
**Problem:** Email adresa već registrovana  
**Rešenje:** Koristite drugi email ili izmenite postojećeg korisnika

### "Cannot delete your own account"
**Problem:** Pokušaj brisanja sopstvenog naloga  
**Rešenje:** Drugi admin mora obrisati vaš nalog

### "Password must be at least 8 characters"
**Problem:** Prekratka lozinka  
**Rešenje:** Koristite minimum 8 karaktera

### "Unauthorized"
**Problem:** Nemate dozvolu za pristup  
**Rešenje:** Prijavite se kao Admin ili Super Admin

---

## 💡 Pro Tips

### Tip 1: Brza Pretraga
Koristite search za bilo šta:
- Ime: "Marko"
- Email: "@gmail.com"
- ID: "123"

### Tip 2: Export Pre Brisanja
Pre masovnog brisanja, exportujte podatke:
- Kliknite "Export"
- Sačuvajte CSV
- Sigurnosna kopija

### Tip 3: Filteri + Search
Kombinujte za precizne rezultate:
- Filter: "Samo Aktivni"
- Search: "@company.com"
- Rezultat: Svi aktivni korisnici sa company.com emailom

### Tip 4: Bulk Actions za Brze Izmene
Ne uređujte pojedinačno:
- Selektujte sve potrebne
- Bulk Activate/Deactivate
- Sačuvajte vreme!

---

## 🔒 Sigurnosni Saveti

### ✅ Dobra Praksa:
- Koristite jake lozinke (min 8 karaktera)
- Deaktivirajte neaktivne naloge
- Redovno pregledajte log aktivnosti
- Dodelite najniže potrebne dozvole

### ❌ Loša Praksa:
- Deljenje kredencijala
- Korišćenje lakih lozinki
- Ostavljanje neaktivnih naloga aktivnim
- Davanje suviše dozvola

---

## 📞 Pomoć

### Kontakt:
- **Email:** support@plantim.com
- **Dokumentacija:** `/docs/USER_MANAGEMENT_MODULE.md`
- **Video Tutorial:** [Link]

### Često Postavljana Pitanja:
**Q: Koliko korisnika mogu dodati?**  
A: Nema limita!

**Q: Mogu li vratiti obrisanog korisnika?**  
A: Trenutno ne, brisanje je trajno.

**Q: Kako resetovati lozinku korisnika?**  
A: Uredi korisnika i unesi novu lozinku.

**Q: Šta znači "Super Admin"?**  
A: Najviši nivo pristupa, potpuna kontrola sistema.

---

## 🎊 Gotovo!

**Sada znate kako:**
- ✅ Kreirati korisnike
- ✅ Uređivati korisnike
- ✅ Pretraživati i filtrirati
- ✅ Dodeliti uloge
- ✅ Koristiti masovne akcije
- ✅ Upravljati pristupom

**Uživajte u upravljanju korisnicima! 🚀**

---

**Verzija:** 1.0  
**Datum:** 2025-11-18






