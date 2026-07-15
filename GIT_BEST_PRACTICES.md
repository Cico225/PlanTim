# 📚 Git Best Practices za PlanTim Projekt

Ovaj vodič objašnjava kako pravilno koristiti Git da se zaštiti postojeći kod i omogući lakše vraćanje ako nešto ne radi.

---

## 🎯 **Osnovni Git Workflow**

### **1. Pre Bilo Koje Izmene**

```bash
# Uvek napravi commit postojećeg stanja
git add .
git commit -m "Backup: Snapshot before [OPIS IZMENE]"

# Ili kreiraj novi branch
git checkout -b feature/new-feature-name
```

### **2. Tokom Izmene**

```bash
# Česti commituci sa jasnim porukama
git add .
git commit -m "Add: Nova funkcionalnost bez menjanja postojeće"

# Ako nešto ne radi, možeš se vratiti
git log  # Vidi historiju
git checkout <commit-hash>  # Vrati se na prethodnu verziju
```

### **3. Nakon Izmene**

```bash
# Testiraj da sve radi
# Tek onda merge u main
git checkout main
git merge feature/new-feature-name
```

---

## 🛡️ **Zaštita Postojećeg Koda**

### **Korak 1: Snapshot Pre Izmene**

```bash
# Napravi tag za trenutnu verziju
git tag -a v1.0-backup-before-changes -m "Backup before [OPIS]"

# Proveri da tag postoji
git tag -l
```

### **Korak 2: Rad na Novom Branch-u**

```bash
# Kreiraj novi branch
git checkout -b feature/add-new-module

# Radi izmene
# ... (izmeni fajlove) ...

# Commit izmene
git add .
git commit -m "Add: Novi modul bez menjanja postojećeg"
```

### **Korak 3: Vraćanje ako Nešto Ne Radi**

```bash
# Vrati se na main branch (pre izmena)
git checkout main

# Ili vrati specifičan fajl
git checkout main -- path/to/file.php

# Ili vrati na tag
git checkout v1.0-backup-before-changes
```

---

## 📋 **Commit Message Best Practices**

### **✅ DOBRE Commit Poruke:**

```
Add: Chat module without modifying existing functionality
Fix: Notification count error without changing API structure
Update: Dashboard styling without breaking layout
Refactor: Code cleanup without changing behavior
```

### **❌ LOŠE Commit Poruke:**

```
Changes
Fixed stuff
Updated
Test
```

---

## 🔄 **Git Branches Strategija**

### **Main Branch**
- **Samo** funkcionalan kod
- **Samo** testiran i verifikovan kod
- **Nikada** direktne izmene (uvek preko branch-a)

### **Feature Branches**
```bash
feature/add-chat-module
feature/update-user-management
feature/fix-notification-bug
```

### **Hotfix Branches**
```bash
hotfix/critical-security-patch
hotfix/database-connection-fix
```

---

## 🚨 **Hitno Vraćanje**

### **Vraćanje Poslednjeg Commit-a**

```bash
# Vrati poslednji commit ali zadrži izmene u fajlovima
git reset --soft HEAD~1

# Vrati poslednji commit i ukloni izmene
git reset --hard HEAD~1
```

### **Vraćanje Specifičnog Fajla**

```bash
# Vrati fajl na verziju iz main branch-a
git checkout main -- path/to/file.php

# Vrati fajl na verziju iz specifičnog commit-a
git checkout <commit-hash> -- path/to/file.php
```

### **Vraćanje Na Tag**

```bash
# Vrati celu bazu na verziju iz tag-a
git checkout v1.0-backup-before-changes
```

---

## 📝 **Git Workflow Checklist**

```
□ Git status proveren pre izmene?
□ Commit napravljen pre izmene?
□ Branch kreiran za novu funkcionalnost?
□ Commit poruke su jasne i opisuju šta je dodato?
□ Testiranje urađeno pre merge-a?
□ Backup baze napravljen (nezavisno od Gita)?
```

---

## 🎓 **Korisne Git Komande**

```bash
# Status - videti šta je promenjeno
git status

# Diff - videti tačno šta je promenjeno
git diff

# Log - videti istoriju commit-ova
git log --oneline

# Stash - privremeno sačuvati izmene
git stash
git stash pop

# Branch - videti sve branch-eve
git branch -a

# Remote - videti remote repository
git remote -v
```

---

**Zapamti:** Git je alat za zaštitu koda, ali **ne zamenjuje backup baze podataka**! Uvek napravi oba! 🛡️















