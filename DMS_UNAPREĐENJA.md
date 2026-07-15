# 🚀 DMS Modul - Unapređenja

## ✅ Implementirano

### 🔧 Backend (Laravel)

1. **Fizička Struktura Foldera**
   - Folderi se kreiraju lokalno: `storage/app/public/documents/{folder-path}/`
   - Automatsko kreiranje nested strukture

2. **Nested Folderi**
   - Folder unutar foldera (neograničena dubina)
   - Path tracking: `parent/child/grandchild`
   - Podržava `parent_folder_id` relaciju

3. **Brisanje Foldera**
   - Endpoint: `DELETE /api/dms/folders/{id}`
   - Provera: ne dozvoljava brisanje ako ima dokumenta ili podfoldera
   - Briše fizički folder sa diska

4. **Premještanje Dokumenata**
   - Endpoint: `PUT /api/dms/documents/{id}/move`
   - Premješta fizički fajl na disku
   - Ažurira `folder_id` i `path` u bazi

5. **Verzioniranje Dokumenata**
   - Tabela: `document_versions`
   - Upload nove verzije: POST sa `document_id` parametrom
   - Čuva stare verzije sa metapodacima
   - Get verzije: `GET /api/dms/documents/{id}/versions`
   - Download verzije: `GET /api/dms/documents/{id}/versions/{versionId}/download`

### 🎨 Frontend (React/TypeScript)

1. **FolderTree Komponenta**
   - Lokacija: `frontend/src/modules/dms/components/FolderTree.tsx`
   - Tree view sa nested folderima
   - Expand/Collapse funkcionalnost
   - Kreiranje podfoldera (ikona uz folder)
   - Brisanje foldera

2. **VersionHistoryModal Komponenta**
   - Lokacija: `frontend/src/modules/dms/components/VersionHistoryModal.tsx`
   - Prikaz trenutne verzije (zeleno označeno)
   - Lista svih prethodnih verzija
   - Download bilo koje verzije
   - Prikaz meta podataka (ko, kada, veličina)

3. **MoveDocumentModal Komponenta**
   - Lokacija: `frontend/src/modules/dms/components/MoveDocumentModal.tsx`
   - Tree selektor za izbor destinacije
   - Prikazuje sve foldere osim trenutnog
   - Omogućava premještanje u root

4. **Nove Funkcije u DMSOverview**
   - `handleDeleteFolder()` - Brisanje foldera
   - `handleMoveDocument()` - Premještanje dokumenata
   - `openVersionHistory()` - Otvaranje istorije verzija
   - `openCreateFolderModal()` - Kreiranje u parent folderu

---

## 🗂️ Struktura Foldera

```
storage/app/public/documents/
├── projekti/                    ← Root folder
│   ├── 2023/                    ← Nested folder
│   │   ├── dokument1.pdf
│   │   └── dokument2.docx
│   └── 2024/
│       └── prezentacija.pptx
├── finansije/
│   ├── fakture/                 ← Nested folder
│   │   └── faktura-001.pdf
│   └── izvjestaji/
│       └── godisnji-izvjestaj.xlsx
└── dokument-root.pdf            ← Dokument bez foldera
```

---

## 📡 API Endpointi

### Folderi

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/dms/folders` | Lista svih foldera sa brojem dokumenata |
| POST | `/api/dms/folders` | Kreiranje novog foldera |
| DELETE | `/api/dms/folders/{id}` | Brisanje foldera (ako je prazan) |

**POST Body za kreiranje:**
```json
{
  "name": "Novi Folder",
  "parent_folder_id": 5  // opciono - za nested folder
}
```

### Dokumenti

| Method | Endpoint | Opis |
|--------|----------|------|
| GET | `/api/dms/documents` | Lista dokumenata (filtriranje po folderu) |
| POST | `/api/dms/documents/upload` | Upload dokumenta |
| PUT | `/api/dms/documents/{id}/move` | Premještanje dokumenta |
| DELETE | `/api/dms/documents/{id}` | Brisanje dokumenta |
| GET | `/api/dms/documents/{id}/download` | Download dokumenta |

**PUT Body za premještanje:**
```json
{
  "folder_id": 3  // ili null za root
}
```

### Verzioniranje

| Method | Endpoint | Opis |
|--------|----------|------|
| POST | `/api/dms/documents/upload` | Upload nove verzije (sa `document_id`) |
| GET | `/api/dms/documents/{id}/versions` | Lista svih verzija |
| GET | `/api/dms/documents/{id}/versions/{versionId}/download` | Download određene verzije |

**POST Body za novu verziju:**
```json
{
  "file": File,
  "document_id": 10,
  "changes_description": "Ažuriran sadržaj"
}
```

---

## 🎯 Kako Koristiti

### 1. Kreiranje Nested Foldera

- Kliknite ikonu **+** uz postojeći folder
- Unesite naziv novog podfoldera
- Kliknite "Kreiraj Folder"

### 2. Premještanje Dokumenta

- Kliknite **meni** (3 tačke) na dokumentu
- Izaberite "Premjesti"
- U modalу odaberite destinacijski folder
- Kliknite "Premjesti"

### 3. Prikaz Verzija

- Kliknite **meni** (3 tačke) na dokumentu
- Izaberite "Verzije"
- Vidite trenutnu verziju i sve prethodne
- Download bilo koje verzije

### 4. Upload Nove Verzije

- Kliknite **meni** (3 tačke) na dokumentu
- Izaberite "Nova Verzija"
- Upload-ujte novi fajl
- Stara verzija se automatski čuva

### 5. Brisanje Foldera

- Kliknite ikonu **košnice** uz folder
- Potvrda: folder mora biti prazan (bez dokumenata i podfoldera)

---

## 🔧 Dodatna Polja u Bazi

### document_versions tabela

| Kolona | Tip | Opis |
|--------|-----|------|
| id | bigint | Primarni ključ |
| document_id | bigint | FK - documents.id |
| version | int | Broj verzije (1, 2, 3...) |
| path | string | Put do stare verzije |
| size | bigint | Veličina fajla |
| uploaded_by_id | bigint | FK - users.id |
| changes_description | text | Opis promjena |
| created_at | timestamp | Kada je verzija kreirana |

### dms_folders tabela (ažurirano)

| Kolona | Tip | Opis |
|--------|-----|------|
| path | string | Dodato - relativna putanja |
| owner_id | bigint | Dodato - FK - users.id |

---

## ✅ Test Scenario

1. **Kreiraj root folder "Projekti"**
2. **Kreiraj podfolder "2024" unutar "Projekti"**
3. **Upload dokument u "2024" folder**
4. **Upload novu verziju istog dokumenta**
5. **Otvori verzije i preuzmi staru verziju**
6. **Premjesti dokument u drugi folder**
7. **Obriši prazne foldere**

---

## 📦 Fajlovi Kreirani/Ažurirani

### Backend
- ✅ `app/Http/Controllers/Api/DMSController.php` - Ažurirano
- ✅ `routes/api.php` - Dodati novi endpointi
- ✅ `database/migrations/*_add_path_to_dms_folders.php` - Kreirana

### Frontend
- ✅ `frontend/src/modules/dms/components/FolderTree.tsx` - Kreirano
- ✅ `frontend/src/modules/dms/components/VersionHistoryModal.tsx` - Kreirano
- ✅ `frontend/src/modules/dms/components/MoveDocumentModal.tsx` - Kreirano
- ✅ `frontend/src/modules/dms/pages/DMSOverview.tsx` - Ažurirano

---

## 🎉 SVE FUNKCIONALNOSTI IMPLEMENTIRANE!

- ✅ Fizička struktura foldera lokalno
- ✅ Nested folderi (folder u folderu)
- ✅ Brisanje foldera
- ✅ Premještanje dokumenata
- ✅ Verzioniranje dokumenata
- ✅ Tree view UI
- ✅ Version history UI
- ✅ Move document UI

---

**Restartujte servere (`START_ALL_AUTO.bat`) i testirajte DMS modul!** 🚀

