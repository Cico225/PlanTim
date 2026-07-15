# 🧹 DMS Cleanup - Brisanje Orphaned Zapisa

Ovaj set alata omogućava brisanje zapisa iz DMS tabela za foldere i dokumente koji više ne postoje na disku.

## 📁 Dostupni Alati

### 1. Artisan Command (Preporučeno)
```bash
# Dry run - samo pregled šta bi bilo obrisano
php artisan dms:cleanup-orphans

# Stvarno brisanje
php artisan dms:cleanup-orphans --execute
```

### 2. Standalone PHP Script
```bash
# Dry run
php cleanup_dms_orphaned_records.php

# Stvarno brisanje
php cleanup_dms_orphaned_records.php --execute
```

### 3. SQL Script
- Otvori `cleanup_dms_sql.sql` u MySQL klijentu
- Pokreni komande korak po korak

## 🔍 Šta Script Radi

### Proverava i briše:

1. **Foldere** čiji fizički direktorijumi ne postoje u `storage/app/public/documents/`
2. **Dokumente** čiji fizički fajlovi ne postoje na disku
3. **Verzije dokumenata** čiji fizički fajlovi ne postoje na disku

### Automatski briše povezane zapise:
- Share linkove za obrisane dokumente
- Permissions za obrisane dokumente/foldere
- Subfoldere rekurzivno

## ⚠️ Sigurnosne Mere

### Pre pokretanja:
1. **Napravi backup baze podataka!**
   ```bash
   mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Pokreni dry run** da vidiš šta će biti obrisano:
   ```bash
   php artisan dms:cleanup-orphans
   ```

3. **Proveri rezultate** pre stvarnog brisanja

## 📊 Primer Izlaza

```
=== DMS CLEANUP ORPHANED RECORDS ===
Mode: DRY RUN

1. Checking folders...
   ✅ Folder OK: Projekti
   ❌ Missing folder: Stari Folder (Path: stari-folder)
      Physical path: /path/to/storage/app/public/documents/stari-folder
   ✅ Folder OK: Finansije

2. Checking documents...
   ✅ Document OK: dokument1.pdf
   ❌ Missing document: obrisani-fajl.docx
      Physical path: /path/to/storage/app/public/documents/obrisani-fajl.docx

3. Checking document versions...
   ✅ Version OK: dokument1.pdf (v1)

=== SUMMARY ===
Folders to delete: 1
Documents to delete: 1
Versions to delete: 0

To actually delete these records, run:
php artisan dms:cleanup-orphans --execute
```

## 🗂️ Struktura DMS Tabela

```
dms_folders
├── id, name, path, parent_folder_id
├── owner_id, created_at, updated_at
└── deleted_at (soft delete)

dms_documents
├── id, name, file_name, file_path
├── folder_id, owner_id, created_by
└── created_at, updated_at, deleted_at

dms_document_versions
├── id, document_id, version
├── file_name, file_path, file_size
└── uploaded_by, created_at

dms_share_links
├── id, document_id, token
└── expires_at, created_at

dms_permissions
├── id, permissionable_type, permissionable_id
└── user_id, permission, created_at
```

## 🔧 Troubleshooting

### Problem: "Class not found"
```bash
composer dump-autoload
```

### Problem: "Database connection error"
- Proveri `.env` fajl
- Proveri da li je MySQL pokrenut

### Problem: "Permission denied"
```bash
chmod +x cleanup_dms_orphaned_records.php
```

## 📝 Napomene

- Script automatski preskače soft-deleted zapise
- Rekurzivno briše subfoldere i njihov sadržaj
- Čuva integritet baze kroz foreign key constraints
- Loguje sve akcije za lakše praćenje

## 🚨 Hitno Vraćanje

Ako nešto pođe po zlu, možeš vratiti iz backup-a:
```bash
mysql -u username -p database_name < backup_file.sql
```
















