# 🛡️ Vodič: 
Zaštita Postojećih Funkcionalnosti i Baze Podataka
Ovaj vodič objašnjava **BEST PRACTICES** kako da dodajemo nove funkcionalnosti ili menjamo postojeće **BEZ** menjanja ili brisanja postojećih funkcionalnosti koje rade.

---

## 📋 **CHECKLIST PRE IZMENA**

Pre nego što počneš sa izmenama, **UVEK** uradi sledeće:

### ✅ **1. Git Commit Postojećeg Stanja**
```bash
# Uvek napravi commit pre izmena
git add .
git commit -m "Backup: Snapshot pre [OPIS IZMENE]"
```

### ✅ **2. Backup Baze Podataka**
```bash
# Windows (PowerShell)
cd C:\xampp\htdocs\PlanTim
C:\xampp\mysql\bin\mysqldump.exe -u root plantim > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql

# Ili koristi batch fajl
BACKUP_DATABASE.bat
```

### ✅ **3. Pročitaj Postojeći Kod**
- **NIKADA** ne briši fajlove bez čitanja
- Pročitaj celu funkcionalnost pre menjanja
- Razumi šta postojeći kod radi

### ✅ **4. Testiraj Postojeću Funkcionalnost**
- Pokreni aplikaciju
- Testiraj funkcionalnost koja će biti menjana
- Snimi screenshot ili napravi notu kako radi

---

## 🔒 **PRAVILA ZA IZMENE**

### **1. NE BRIŠI POSTOJEĆE FAJLOVE**

❌ **GREŠKA:**
```bash
# BAD: Brisanje postojećeg fajla
rm frontend/src/components/OldComponent.tsx
```

✅ **ISPRAVNO:**
- Ako moraš brisati, prvo kreiraj novi fajl
- Migriraj funkcionalnost u novi fajl
- Testiraj da novo radi
- **Tek onda** obriši stari

---

### **2. NE MENJAJ POSTOJEĆU BAZU PODATAKA**

❌ **GREŠKA:**
```php
// BAD: Brisanje kolone iz postojeće tabele
Schema::table('users', function (Blueprint $table) {
    $table->dropColumn('old_field'); // NE!
});
```

✅ **ISPRAVNO:**
```php
// GOOD: Dodavanje nove kolone BEZ brisanja stare
Schema::table('users', function (Blueprint $table) {
    if (!Schema::hasColumn('users', 'new_field')) {
        $table->string('new_field')->nullable()->after('existing_field');
    }
});
```

**Princip:** Uvek dodavaj, nikad ne briši kolone iz postojećih tabela!

---

### **3. KORISTI MIGRACIJE PRAVILNO**

#### **✅ DOBRE PRAKSE:**

```php
<?php
// DOBRA migracija: Dodaje novu tabelu BEZ menjanja postojeće
return new class extends Migration
{
    public function up(): void
    {
        // Provera da tabela ne postoji
        if (!Schema::hasTable('new_table')) {
            Schema::create('new_table', function (Blueprint $table) {
                $table->id();
                // ...
            });
        }
    }
    
    public function down(): void
    {
        // Rollback: briše samo ono što je dodato
        Schema::dropIfExists('new_table');
    }
};
```

#### **❌ LOŠE PRAKSE:**

```php
<?php
// LOŠA migracija: Menja postojeću tabelu
return new class extends Migration
{
    public function up(): void
    {
        // NE! Ovo menja postojeću tabelu
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('email'); // BRISANJE POSTOJEĆE KOLONE!
        });
    }
};
```

---

### **4. BACKWARD COMPATIBILITY (Kompatibilnost sa Starim Kodom)**

#### **✅ DOBAR PRIMER:**

```php
// Dodaj novi parametar BEZ menjanja postojeće funkcionalnosti
public function createProject($name, $description = null, $newParam = null)
{
    // Postojeći kod radi kao pre
    $project = [
        'name' => $name,
        'description' => $description,
    ];
    
    // Nova funkcionalnost je opciona
    if ($newParam !== null) {
        $project['new_field'] = $newParam;
    }
    
    return $project;
}
```

#### **❌ LOŠ PRIMER:**

```php
// Menja postojeću funkcionalnost - može pokvariti stari kod!
public function createProject($name, $newParam) // Parametar je sada obavezan!
{
    // Stari kod koji poziva createProject($name) će pasti!
}
```

---

### **5. VERSION CONTROL (Git) Best Practices**

#### **Pre Izmene:**
```bash
# 1. Napravi novi branch
git checkout -b feature/new-feature-name

# 2. Commit trenutno stanje
git add .
git commit -m "Current state before changes"
```

#### **Tokom Izmene:**
```bash
# Česti commituci sa jasnim porukama
git add .
git commit -m "Add: Nova funkcionalnost bez menjanja postojeće"

# Ako nešto ne radi, možeš se vratiti
git log  # Vidi historiju
git checkout <commit-hash>  # Vrati se na prethodnu verziju
```

#### **Nakon Izmene:**
```bash
# Testiraj da sve radi
# Tek onda merge u main
git checkout main
git merge feature/new-feature-name
```

---

## 🗄️ **BACKUP BAZE PODATAKA**

### **Automatski Backup (Preporučeno)**

Kreiraj `BACKUP_DATABASE.bat`:

```batch
@echo off
SET PHP_PATH=C:\xampp\php\php.exe
SET MYSQL_PATH=C:\xampp\mysql\bin\mysqldump.exe
SET BACKUP_DIR=backups
SET DATE_STR=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
SET DATE_STR=%DATE_STR: =0%

echo Creating backup directory...
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Creating database backup...
"%MYSQL_PATH%" -u root plantim > "%BACKUP_DIR%\backup_%DATE_STR%.sql

echo Backup created: %BACKUP_DIR%\backup_%DATE_STR%.sql
pause
```

### **Ručni Backup (Pre Svake Izmene)**

```bash
# PowerShell
cd C:\xampp\htdocs\PlanTim
C:\xampp\mysql\bin\mysqldump.exe -u root plantim > backup_before_changes.sql

# Provera da backup postoji
if (Test-Path "backup_before_changes.sql") {
    Write-Host "✅ Backup created successfully!"
}
```

---

## 📝 **WORKFLOW ZA DODAVANJE NOVE FUNKCIONALNOSTI**

### **Korak 1: Priprema**
```
□ Git commit postojećeg stanja
□ Backup baze podataka
□ Pročitaj postojeći kod koji će se koristiti
□ Testiraj postojeću funkcionalnost
```

### **Korak 2: Kreiranje Novih Fajlova**
```
□ Kreiraj NOVE fajlove (ne menjaj stare)
□ Dodaj NOVE tabele (ne menjaš postojeće)
□ Dodaj NOVE kolone (ne brišeš stare)
```

### **Korak 3: Integracija**
```
□ Integriraj novu funkcionalnost sa postojećom
□ Proveri da postojeća funkcionalnost još uvek radi
□ Testiraj obe (staru i novu)
```

### **Korak 4: Testiranje**
```
□ Testiraj novu funkcionalnost
□ Testiraj da postojeća funkcionalnost još uvek radi
□ Testiraj integraciju između starih i novih delova
```

### **Korak 5: Deployment**
```
□ Git commit izmena
□ Backup baze podataka posle izmena
□ Dokumentuj šta je dodato
```

---

## 🚨 **ŠTA RADITI AKO NEŠTO POKVARIM**

### **Hitno Vraćanje iz Backup-a**

#### **1. Vrati Kod iz Gita:**
```bash
# Vidi šta je promenjeno
git status

# Vrati sve izmene
git reset --hard HEAD

# Ili vrati specifičan fajl
git checkout HEAD -- path/to/file.php
```

#### **2. Vrati Bazu Podataka:**
```bash
# Restore iz backup fajla
mysql -u root plantim < backup_before_changes.sql

# Ili preko batch fajla
RESTORE_DATABASE.bat backup_before_changes.sql
```

---

## 📚 **PRIMERI PRAVILNIH IZMENA**

### **Primer 1: Dodavanje Nove Kolone u Postojeću Tabelu**

```php
<?php
// ✅ ISPRAVNO: Dodaje novu kolonu bez brisanja stare
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            // Provera da kolona ne postoji
            if (!Schema::hasColumn('projects', 'new_status')) {
                $table->string('new_status')->nullable()->after('status');
            }
        });
    }
    
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (Schema::hasColumn('projects', 'new_status')) {
                $table->dropColumn('new_status');
            }
        });
    }
};
```

### **Primer 2: Dodavanje Novog API Endpoint-a**

```php
<?php
// ✅ ISPRAVNO: Dodaje novi endpoint bez menjanja postojećeg
Route::middleware(['auth:sanctum'])->group(function () {
    // Postojeći endpoint - NE MENJAJ!
    Route::get('/projects', [ProjectController::class, 'index']);
    
    // Novi endpoint - DODAJ!
    Route::get('/projects/stats', [ProjectController::class, 'stats']);
});
```

### **Primer 3: Dodavanje Nove Funkcionalnosti u Postojeći Controller**

```php
<?php
// ✅ ISPRAVNO: Dodaje novu metodu bez menjanja postojeće
class ProjectController extends Controller
{
    // Postojeća metoda - NE MENJAJ!
    public function index()
    {
        return response()->json(['projects' => Project::all()]);
    }
    
    // Nova metoda - DODAJ!
    public function stats()
    {
        return response()->json([
            'total' => Project::count(),
            'active' => Project::where('status', 'active')->count(),
        ]);
    }
}
```

---

## ✅ **FINALNI CHECKLIST**

Pre svake izmene, proveri:

```
□ Git commit napravljen?
□ Backup baze podataka napravljen?
□ Postojeći kod pročitan i razumevan?
□ Postojeća funkcionalnost testirana?
□ Nova funkcionalnost dodata bez menjanja stare?
□ Nisu obrisani postojeći fajlovi?
□ Nisu obrisane postojeće tabele ili kolone?
□ Nisu promenjeni postojeći API endpoint-i?
□ Testirano da postojeća funkcionalnost još uvek radi?
□ Dokumentovano šta je dodato?
```

---

## 📞 **POMOĆ**

Ako imaš nedoumice:

1. **Pročitaj ovaj vodič**
2. **Napravi backup**
3. **Kreiraj novi branch u Gitu**
4. **Testiraj na maloj izmeni pre veće**

**Zapamti:** Uvek je bolje biti siguran i napraviti backup nego pokvariti nešto što radi! 🛡️















