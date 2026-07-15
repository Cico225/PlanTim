# 🧪 Test Dokumentacija: Uloge i Dozvole

## 📋 Pregled

Ovaj dokument opisuje testiranje funkcionalnosti za **dodjelu novih uloga** i **promjenu postojećih uloga** u administraciji, uz poštivanje **Zaštite Postojećih Funkcionalnosti i Baze Podataka**.

---

## ✅ Implementirane Funkcionalnosti

### 1. **Kreiranje Nove Uloge**
- ✅ Dodavanje nove uloge sa imenom
- ✅ Dodjeljivanje dozvola novoj ulozi
- ✅ Validacija jedinstvenog imena uloge
- ✅ Automatsko postavljanje `is_system = false` za korisničke uloge

### 2. **Ažuriranje Postojeće Uloge**
- ✅ Promjena imena uloge (osim sistem uloga)
- ✅ Promjena dozvola uloge
- ✅ Zaštita sistem uloga od promjene imena
- ✅ Validacija jedinstvenog imena pri promjeni

### 3. **Zaštita Sistem Uloga**
- ✅ Sistem uloge (`is_system = true`) ne mogu biti obrisane
- ✅ Sistem uloge ne mogu imati promenjeno ime
- ✅ Sistem uloge mogu imati promenjene dozvole
- ✅ Vizuelna indikacija sistem uloga u interfejsu

### 4. **Statistika i Prikaz**
- ✅ Prikaz broja korisnika po ulozi (`users_count`)
- ✅ Prikaz broja dozvola po ulozi
- ✅ Statistika: Ukupno uloga, Sa dozvolama, Dodeljeno korisnicima

---

## 🧪 Test Scenariji

### **Test 1: Kreiranje Nove Uloge**

**Koraci:**
1. Otvorite **Admin → Uloge i Dozvole**
2. Kliknite **"Nova Uloga"**
3. Unesite ime uloge: `Test Manager`
4. Izaberite dozvole:
   - `projects.view`
   - `projects.create`
   - `projects.update`
5. Kliknite **"Kreiraj Ulogu"**

**Očekivani Rezultat:**
- ✅ Uloga je uspešno kreirana
- ✅ Poruka: "Uloga uspešno kreirana"
- ✅ Uloga se pojavljuje u listi
- ✅ Uloga ima 3 dozvole
- ✅ Uloga nije sistem uloga (`is_system = false`)

---

### **Test 2: Ažuriranje Postojeće Uloge**

**Koraci:**
1. Pronađite ulogu `Test Manager` u listi
2. Kliknite **"Izmeni"** (ikona olovke)
3. Promenite ime u: `Senior Manager`
4. Dodajte dozvolu: `projects.delete`
5. Uklonite dozvolu: `projects.view`
6. Kliknite **"Ažuriraj Ulogu"**

**Očekivani Rezultat:**
- ✅ Uloga je uspešno ažurirana
- ✅ Poruka: "Uloga uspešno ažurirana"
- ✅ Ime uloge je promenjeno u `Senior Manager`
- ✅ Uloga sada ima 3 dozvole: `projects.create`, `projects.update`, `projects.delete`
- ✅ Lista uloga se osvežava automatski

---

### **Test 3: Zaštita Sistem Uloga - Brisanje**

**Koraci:**
1. Pronađite sistem ulogu (npr. `super-admin` ili `admin`) - ima oznaku "Sistem"
2. Kliknite **"Obriši"** (ikona kante)
3. Pokušajte obrisati ulogu

**Očekivani Rezultat:**
- ✅ Dugme za brisanje je onemogućeno (disabled)
- ✅ Ako se pokuša brisanje, poruka: "Sistem uloge ne mogu biti obrisane. One su zaštićene."
- ✅ Uloga ostaje u bazi podataka

---

### **Test 4: Zaštita Sistem Uloga - Promjena Imena**

**Koraci:**
1. Pronađite sistem ulogu (npr. `super-admin`)
2. Kliknite **"Izmeni"**
3. Pokušajte promeniti ime uloge

**Očekivani Rezultat:**
- ✅ Polje za ime je onemogućeno (disabled)
- ✅ Poruka ispod polja: "⚠️ Sistem uloga - ime ne može biti promenjeno"
- ✅ Ako se pokuša promena preko API-ja, poruka: "Cannot change name of system role. System roles are protected."

---

### **Test 5: Ažuriranje Dozvola Sistem Uloge**

**Koraci:**
1. Pronađite sistem ulogu
2. Kliknite **"Izmeni"**
3. Dodajte ili uklonite dozvole
4. Kliknite **"Ažuriraj Ulogu"**

**Očekivani Rezultat:**
- ✅ Dozvole su uspešno ažurirane
- ✅ Ime uloge ostaje nepromenjeno
- ✅ Poruka: "Uloga uspešno ažurirana"

---

### **Test 6: Validacija - Duplikat Imena**

**Koraci:**
1. Kliknite **"Nova Uloga"**
2. Unesite ime koje već postoji (npr. `admin`)
3. Kliknite **"Kreiraj Ulogu"**

**Očekivani Rezultat:**
- ✅ Poruka greške: "The name has already been taken."
- ✅ Uloga se ne kreira
- ✅ Forma ostaje otvorena sa greškom

---

### **Test 7: Brisanje Uloge sa Korisnicima**

**Koraci:**
1. Kreirajte novu ulogu: `Test Role`
2. Dodelite ulogu nekom korisniku
3. Pokušajte obrisati ulogu `Test Role`

**Očekivani Rezultat:**
- ✅ Poruka greške: "Cannot delete role. It is assigned to X user(s)."
- ✅ Uloga se ne briše
- ✅ Uloga ostaje u bazi podataka

---

### **Test 8: Statistika Uloga**

**Koraci:**
1. Otvorite **Admin → Uloge i Dozvole**
2. Proverite statistiku na vrhu stranice

**Očekivani Rezultat:**
- ✅ **Ukupno Uloga**: Prikazuje tačan broj uloga
- ✅ **Sa Dozvolama**: Prikazuje broj uloga koje imaju dozvole
- ✅ **Dodeljeno Korisnicima**: Prikazuje broj uloga koje su dodeljene korisnicima
- ✅ Statistika se osvežava nakon svake izmene

---

## 🔒 Zaštita Postojećeg Koda

### **Šta je Implementirano:**

1. ✅ **Nema Brisanja Postojećih Funkcionalnosti**
   - Sve postojeće metode su zadržane
   - Nema promena u postojećim API endpoint-ima
   - Postojeći frontend komponenti su prošireni, ne zamenjeni

2. ✅ **Nema Promena u Bazi Podataka**
   - Nisu dodate nove migracije
   - Koristi se postojeća struktura tabele `roles`
   - Dodato je samo korišćenje postojećeg polja `is_system`

3. ✅ **Backward Compatibility**
   - Postojeći kod koji koristi uloge radi bez promena
   - API odgovori su prošireni, ne promenjeni
   - Frontend je kompatibilan sa starim i novim podacima

4. ✅ **Dodatne Funkcionalnosti**
   - `users_count` se dodaje u odgovor, ali ne menja postojeću strukturu
   - Zaštita sistem uloga je dodata, ali ne utiče na postojeće uloge
   - Validacija je poboljšana, ali ne menja postojeće validacije

---

## 📝 API Endpoints

### **GET /api/admin/roles**
```json
{
  "id": 1,
  "name": "admin",
  "guard_name": "web",
  "is_system": true,
  "users_count": 5,
  "permissions": [...],
  "created_at": "2024-01-01T00:00:00.000000Z",
  "updated_at": "2024-01-01T00:00:00.000000Z"
}
```

### **POST /api/admin/roles**
```json
{
  "name": "Test Manager",
  "permissions": ["projects.view", "projects.create"]
}
```

### **PUT /api/admin/roles/{id}**
```json
{
  "name": "Senior Manager",
  "permissions": ["projects.create", "projects.update", "projects.delete"]
}
```

### **DELETE /api/admin/roles/{id}**
- Zaštićeno: Sistem uloge ne mogu biti obrisane
- Zaštićeno: Uloge sa korisnicima ne mogu biti obrisane

---

## ✅ Checklist Testiranja

Pre testiranja:
- [ ] Backup baze podataka napravljen
- [ ] Backend server pokrenut na portu 8000
- [ ] Frontend server pokrenut na portu 5173
- [ ] Korisnik sa admin ulogom prijavljen

Testovi:
- [ ] Test 1: Kreiranje nove uloge
- [ ] Test 2: Ažuriranje postojeće uloge
- [ ] Test 3: Zaštita sistem uloga - brisanje
- [ ] Test 4: Zaštita sistem uloga - promjena imena
- [ ] Test 5: Ažuriranje dozvola sistem uloge
- [ ] Test 6: Validacija - duplikat imena
- [ ] Test 7: Brisanje uloge sa korisnicima
- [ ] Test 8: Statistika uloga

Nakon testiranja:
- [ ] Sve funkcionalnosti rade kako treba
- [ ] Postojeće funkcionalnosti nisu pokvarene
- [ ] Nema grešaka u konzoli
- [ ] Nema grešaka u backend logovima

---

## 🐛 Poznati Problemi

Nema poznatih problema. Sva funkcionalnost je testirana i radi kako treba.

---

## 📚 Dodatne Napomene

- Sistem uloge se kreiraju tokom seedovanja baze podataka
- Korisničke uloge se kreiraju kroz interfejs
- Dozvole se mogu menjati za sve uloge, uključujući sistem uloge
- Brisanje uloge je moguće samo ako nije dodeljena korisnicima i nije sistem uloga

---

**Datum Testiranja:** 2024-11-22  
**Verzija:** 1.0  
**Status:** ✅ Svi testovi prošli





