# 🛡️ Zaštita Postojećeg Koda i Baze Podataka

Kada dodaješ nove funkcionalnosti ili menjaš postojeće, **UVEK** koristi ovaj sistem za zaštitu!

---

## 📚 **Dokumentacija**

### 1. **`GUIDE_ZASTITA_POSTOJECEG_KODA.md`**
   - Detaljni vodič o tome kako zaštititi postojeći kod
   - Pravila za izmene koda i baze podataka
   - Primeri dobrih i loših praksi
   - **📖 Pročitaj prvo!**

### 2. **`CHECKLIST_PRE_IZMENE.md`**
   - Brzi checklist pre svake izmene
   - Koristi za svaku izmenu koda ili baze
   - **✅ Koristi pri svakoj izmeni!**

### 3. **`GIT_BEST_PRACTICES.md`**
   - Git workflow za zaštitu koda
   - Kako koristiti branch-eve i commit-e
   - Kako vraćati izmene ako nešto ne radi

---

## 🔧 **Alati**

### 1. **`BACKUP_DATABASE.bat`**
   - Automatski backup baze podataka
   - Kreira backup u `backups/` folderu
   - **🚀 Pokreni PRE svake izmene!**

**Kako koristiti:**
```bash
# Duplim klikom na fajl
BACKUP_DATABASE.bat
```

**Gde se čuva:**
- Folder: `backups/`
- Format: `backup_YYYYMMDD_HHMMSS.sql`

---

### 2. **`RESTORE_DATABASE.bat`**
   - Vraćanje baze podataka iz backup-a
   - **⚠️ Koristi samo ako nešto pokvariš!**

**Kako koristiti:**
```bash
# Duplim klikom na fajl i odaberi backup fajl
RESTORE_DATABASE.bat backups\backup_20241122_143022.sql
```

**⚠️ UPOZORENJE:** Ovo će **ZAMENITI** svu podatke u bazi!

---

## 🚀 **Brzi Start**

### **Pre Svake Izmene:**

1. **Backup Baze:**
   ```bash
   BACKUP_DATABASE.bat
   ```

2. **Git Commit:**
   ```bash
   git add .
   git commit -m "Backup: Snapshot before [OPIS]"
   ```

3. **Pročitaj Checklist:**
   - Otvori `CHECKLIST_PRE_IZMENE.md`
   - Prođi kroz sve tačke

4. **Radi Izmene:**
   - Dodaj novo, ne briši postojeće
   - Testiraj da postojeće još uvek radi

---

## 📋 **Glavna Pravila**

### ✅ **DOZVOLJENO:**

- ✅ Dodavati nove fajlove
- ✅ Dodavati nove tabele u bazu
- ✅ Dodavati nove kolone u postojeće tabele
- ✅ Dodavati nove API endpoint-e
- ✅ Dodavati nove funkcije u postojeće klase
- ✅ Dodavati nove opciona parametre u postojeće funkcije

### ❌ **ZABRANJENO:**

- ❌ Brisati postojeće fajlove bez pregleda
- ❌ Brisati postojeće tabele iz baze
- ❌ Brisati postojeće kolone iz tabela
- ❌ Menjati postojeće API endpoint-e
- ❌ Menjati postojeće funkcije bez potrebe
- ❌ Menjati obavezne parametre u postojećim funkcijama

---

## 🚨 **Ako Nešto Pokvariš**

### **1. Vrati Kod iz Gita:**
```bash
# Vrati poslednji commit
git reset --hard HEAD

# Ili vrati specifičan fajl
git checkout HEAD -- path/to/file.php
```

### **2. Vrati Bazu Podataka:**
```bash
# Restore iz backup-a
RESTORE_DATABASE.bat backups\backup_YYYYMMDD_HHMMSS.sql
```

---

## 📖 **Detaljniji Vodiči**

- **Za izmene koda:** `GUIDE_ZASTITA_POSTOJECEG_KODA.md`
- **Za Git workflow:** `GIT_BEST_PRACTICES.md`
- **Za checklist:** `CHECKLIST_PRE_IZMENE.md`

---

## ✅ **Quick Checklist**

Pre svake izmene:

```
□ Backup baze napravljen?
□ Git commit napravljen?
□ Postojeći kod pročitan?
□ Postojeća funkcionalnost testirana?
□ Nova funkcionalnost dodata bez menjanja stare?
□ Testirano da postojeće još uvek radi?
```

---

**Zapamti:** Uvek je bolje biti siguran i napraviti backup nego pokvariti nešto što radi! 🛡️















