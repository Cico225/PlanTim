# ✅ Checklist Pre Svake Izmene

Koristi ovaj checklist **UVEK** pre nego što počneš sa izmenama koda ili baze podataka.

---

## 📋 **PRIJE IZMENA**

### **1. Git Commit**
- [ ] `git status` - proveri šta je promenjeno
- [ ] `git add .` - dodaj sve izmene
- [ ] `git commit -m "Backup: Snapshot before [OPIS IZMENE]"` - napravi commit

**Alternativa:** Kreiraj novi branch
- [ ] `git checkout -b feature/new-feature-name`

---

### **2. Backup Baze Podataka**
- [ ] Pokreni `BACKUP_DATABASE.bat`
- [ ] Proveri da backup fajl postoji u `backups/` folderu
- [ ] Zapamti ime backup fajla: `backup_YYYYMMDD_HHMMSS.sql`

**Ručno:**
```bash
C:\xampp\mysql\bin\mysqldump.exe -u root plantim > backups\backup_manual.sql
```

---

### **3. Pročitaj Postojeći Kod**
- [ ] Pročitaj sve fajlove koji će biti menjani
- [ ] Razumi šta postojeći kod radi
- [ ] Zapamti ključne delove funkcionalnosti

---

### **4. Testiraj Postojeću Funkcionalnost**
- [ ] Pokreni aplikaciju
- [ ] Testiraj funkcionalnost koja će biti menjana
- [ ] Snimi screenshot ili napravi notu kako trenutno radi
- [ ] Zapamti očekivano ponašanje

---

## 🔧 **TOKOM IZMENA**

### **5. Pravila za Izmene**

- [ ] **NE BRIŠI** postojeće fajlove bez pregleda
- [ ] **NE MENJAJ** postojeće tabele u bazi (ne briši kolone)
- [ ] **NE MENJAJ** postojeće API endpoint-e (dodaj nove ako treba)
- [ ] **NE MENJAJ** postojeće funkcije (dodaj nove ako treba)
- [ ] **DODAJ** novu funkcionalnost bez menjanja stare
- [ ] **TESTIRAJ** da postojeća funkcionalnost još uvek radi

---

### **6. Česti Commituci**
- [ ] Commituj izmene svakih 30-60 minuta
- [ ] Koristi jasne commit poruke:
  - `Add: Nova funkcionalnost`
  - `Fix: Popravka postojeće funkcionalnosti`
  - `Update: Ažuriranje bez menjanja postojećeg`
- [ ] **NIKADA** ne commituj "WIP" ili "test" bez jasnog opisa

---

## ✅ **NAKON IZMENA**

### **7. Testiranje**
- [ ] Testiraj novu funkcionalnost
- [ ] Testiraj da postojeća funkcionalnost još uvek radi
- [ ] Testiraj integraciju između starih i novih delova
- [ ] Proveri da nema JavaScript error-a u konzoli
- [ ] Proveri da nema PHP error-a u logovima

---

### **8. Backup Nakon Izmene**
- [ ] Napravi novi backup ako je baza promenjena
- [ ] Commituj sve izmene u Git
- [ ] Napravi tag ako je značajna izmena:
  ```bash
  git tag -a v1.1-after-changes -m "After [OPIS IZMENE]"
  ```

---

### **9. Dokumentacija**
- [ ] Dokumentuj šta je dodato
- [ ] Dokumentuj ako je nešto promenjeno (sa razlogom)
- [ ] Ažuriraj README ili dokumentaciju ako je potrebno

---

## 🚨 **AKO NEŠTO POKVARIM**

### **10. Hitno Vraćanje**

#### **Vraćanje Koda:**
```bash
# Vrati poslednji commit
git reset --hard HEAD

# Ili vrati specifičan fajl
git checkout HEAD -- path/to/file.php

# Ili vrati na tag
git checkout v1.0-backup-before-changes
```

#### **Vraćanje Baze:**
```bash
# Restore iz backup fajla
RESTORE_DATABASE.bat backups\backup_YYYYMMDD_HHMMSS.sql
```

---

## 📝 **NOTES**

**Datum izmene:** ___________

**Opis izmene:** 
_________________________________________________
_________________________________________________
_________________________________________________

**Fajlovi menjani:**
- [ ] _________________________________
- [ ] _________________________________
- [ ] _________________________________

**Tabele menjane:**
- [ ] _________________________________
- [ ] _________________________________

**Backup fajl:** `backup_YYYYMMDD_HHMMSS.sql`

**Git commit:** `_______________________`

**Tag (ako je kreiran):** `_______________________`

---

## ✅ **FINALNA PROVERA**

- [ ] Postojeća funkcionalnost radi kao pre?
- [ ] Nova funkcionalnost radi kako treba?
- [ ] Backup napravljen i sačuvan?
- [ ] Git commit napravljen?
- [ ] Testiranje urađeno?
- [ ] Dokumentacija ažurirana?

**Sve provere završene?** ✅ / ❌

---

**Zapamti:** Uvek je bolje biti siguran i napraviti backup nego pokvariti nešto što radi! 🛡️















