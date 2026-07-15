# 📋 Plan Implementacije - Project Management Modul

## 🎯 Cilj
Implementacija kompletnog Project Management modula sa svim funkcionalnostima uz poštivanje vodiča "Zaštita Postojećih Funkcionalnosti i Baze Podataka".

## ✅ Postojeća Struktura (NE DIRATI)

### Baza Podataka (Već postoji):
- ✅ `projects` - osnovna tabela projekata
- ✅ `project_members` - članovi projekta
- ✅ `tasks` - taskovi (sa `parent_task_id` za subtaskove)
- ✅ `task_dependencies` - zavisnosti između taskova
- ✅ `task_attachments` - prilozi
- ✅ `task_comments` - komentari

### Backend:
- ✅ `ProjectController` - osnovni CRUD za projekte i taskove
- ✅ API rute osnovne funkcionalnosti

### Frontend:
- ✅ `ProjectsOverview.tsx` - placeholder stranica

## ➕ Nove Tabele (Dodati)

### 1. `task_assignees` (Višestruki assignee)
```sql
- id (PK)
- task_id (FK tasks.id)
- user_id (FK users.id)
- assigned_at TIMESTAMP
- assigned_by (FK users.id)
- unique(task_id, user_id)
```

### 2. `project_activities` (Activity Log specifičan za projekte)
```sql
- id (PK)
- project_id (FK projects.id) NULL
- task_id (FK tasks.id) NULL
- entity_type VARCHAR(50) - 'project' ili 'task'
- action VARCHAR(50) - 'created', 'updated', 'status_changed', 'assigned', etc.
- user_id (FK users.id)
- old_value JSON NULL
- new_value JSON NULL
- metadata JSON NULL
- created_at TIMESTAMP
- index(project_id), index(task_id), index(entity_type)
```

### 3. `kanban_columns` (Customizabilne kolone)
```sql
- id (PK)
- project_id (FK projects.id)
- name VARCHAR(255)
- status VARCHAR(50) - mapiranje na task status
- order INT DEFAULT 0
- wip_limit INT NULL
- color VARCHAR(20) NULL
- created_at TIMESTAMP
- index(project_id)
```

### 4. `time_tracking` (Time Tracking)
```sql
- id (PK)
- task_id (FK tasks.id)
- user_id (FK users.id)
- project_id (FK projects.id) - denormalizacija za brže query-je
- started_at TIMESTAMP
- ended_at TIMESTAMP NULL
- duration INT NULL - u sekundama
- description TEXT NULL
- created_at TIMESTAMP
- index(task_id), index(user_id), index(project_id)
```

### 5. `task_comment_mentions` (@mentions u komentarima)
```sql
- id (PK)
- comment_id (FK task_comments.id)
- user_id (FK users.id) - pomenuti korisnik
- mentioned_by (FK users.id)
- created_at TIMESTAMP
- index(comment_id), index(user_id)
```

## 🔧 Proširenja Postojećih Tabela (Samo DODAVANJE kolona)

### `tasks` tabela - DODATI kolone:
```sql
- kanban_column_id (FK kanban_columns.id) NULL
- swimlane VARCHAR(50) NULL - 'assignee', 'priority', 'epic'
- epic_id INT NULL - za grupisanje taskova
- story_points DECIMAL(4,1) NULL - za Scrum
- position INT DEFAULT 0 - za sortiranje u kanban koloni
```

### `task_comments` tabela - DODATI kolone:
```sql
- mentions JSON NULL - array user ID-jeva
- is_edited BOOLEAN DEFAULT false
- edited_at TIMESTAMP NULL
```

## 📝 Fazni Plan Implementacije

### FAZA 1: Baza Podataka i Permissions (Trenutno)
1. ✅ Kreirati migracije za nove tabele
2. ✅ Dodati kolone u postojeće tabele (SA `Schema::hasColumn` proverom)
3. ✅ Proširiti ProjectController sa permission sistemom (kao DMS)

### FAZA 2: Task Management (Backend)
1. Task CRUD sa subtaskovima i hijerarhijom
2. Višestruki assignee
3. Task dependencies (FS, SS)
4. Task comments sa @mentions
5. Task attachments
6. Activity log sistem

### FAZA 3: Kanban Board (Backend + Frontend)
1. Backend API za kolone i drag & drop
2. Frontend Kanban komponenta

### FAZA 4: Gantt Chart (Backend + Frontend)
1. Backend API za dependencies i timeline
2. Frontend Gantt komponenta

### FAZA 5: Time Tracking
1. Backend API
2. Frontend integracija

### FAZA 6: Integracije
1. Notifications sistem
2. Chat sistem (task threads)
3. Documents modul

### FAZA 7: Frontend
1. Projects Overview stranica
2. Project Detail stranica
3. Task Detail modal/sidebar

## 🛡️ Principi za SVE izmene

1. **NE BRISATI** postojeće tabele/kolone
2. **UVEK** koristiti `Schema::hasColumn` / `Schema::hasTable` provere
3. **UVEK** dodavati `nullable()` za nove kolone koje se dodaju u postojeće tabele
4. **UVEK** testirati da postojeće funkcionalnosti još uvek rade
5. **UVEK** napraviti backup baze pre migracija

















