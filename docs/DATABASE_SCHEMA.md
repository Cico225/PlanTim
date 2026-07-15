# PlanTim - Database Schema Dokumentacija

## Pregled
Kompletan database schema za PlanTim aplikaciju sa 16 modula.

## Tehnologije
- **Database**: MySQL 8.0+
- **Encoding**: UTF8MB4 (za podršku emojija i specijalnih karaktera)
- **Storage Engine**: InnoDB
- **Collation**: utf8mb4_unicode_ci

---

## 1. CORE TABELE (Autentifikacija i Osnovni Podaci)

### users
Korisnici sistema
```sql
- id (PK)
- name VARCHAR(255)
- email VARCHAR(255) UNIQUE
- email_verified_at TIMESTAMP NULL
- password VARCHAR(255)
- avatar VARCHAR(255) NULL
- phone VARCHAR(50) NULL
- locale VARCHAR(10) DEFAULT 'bs'
- theme VARCHAR(20) DEFAULT 'light'
- timezone VARCHAR(50) DEFAULT 'Europe/Sarajevo'
- is_active BOOLEAN DEFAULT true
- last_login_at TIMESTAMP NULL
- remember_token VARCHAR(100) NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

### password_reset_tokens
Tokeni za reset lozinke
```sql
- email VARCHAR(255) PK
- token VARCHAR(255)
- created_at TIMESTAMP
```

### personal_access_tokens (Laravel Sanctum)
API tokeni
```sql
- id (PK)
- tokenable_type VARCHAR(255)
- tokenable_id BIGINT UNSIGNED
- name VARCHAR(255)
- token VARCHAR(64) UNIQUE
- abilities TEXT NULL
- last_used_at TIMESTAMP NULL
- expires_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## 2. RBAC - ROLE BASED ACCESS CONTROL (Modul 9)

### roles
Uloge u sistemu
```sql
- id (PK)
- name VARCHAR(255) UNIQUE
- display_name VARCHAR(255)
- description TEXT NULL
- guard_name VARCHAR(255) DEFAULT 'web'
- is_system BOOLEAN DEFAULT false
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### permissions
Dozvole u sistemu
```sql
- id (PK)
- name VARCHAR(255) UNIQUE
- display_name VARCHAR(255)
- description TEXT NULL
- module VARCHAR(100)
- guard_name VARCHAR(255) DEFAULT 'web'
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### role_has_permissions
Veza rola i dozvola
```sql
- permission_id (FK permissions.id)
- role_id (FK roles.id)
PRIMARY KEY (permission_id, role_id)
```

### model_has_roles
Veza korisnika i rola
```sql
- role_id (FK roles.id)
- model_type VARCHAR(255)
- model_id BIGINT UNSIGNED
PRIMARY KEY (role_id, model_type, model_id)
```

### model_has_permissions
Veza korisnika i direktnih dozvola
```sql
- permission_id (FK permissions.id)
- model_type VARCHAR(255)
- model_id BIGINT UNSIGNED
PRIMARY KEY (permission_id, model_type, model_id)
```

---

## 3. CRM - CUSTOMER RELATIONSHIP MANAGEMENT (Modul 2)

### crm_companies
Kompanije
```sql
- id (PK)
- name VARCHAR(255)
- email VARCHAR(255) NULL
- phone VARCHAR(50) NULL
- website VARCHAR(255) NULL
- industry VARCHAR(100) NULL
- size VARCHAR(50) NULL
- address TEXT NULL
- city VARCHAR(100) NULL
- country VARCHAR(100) NULL
- postal_code VARCHAR(20) NULL
- logo VARCHAR(255) NULL
- notes TEXT NULL
- owner_id (FK users.id) NULL
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

### crm_contacts
Kontakti
```sql
- id (PK)
- company_id (FK crm_companies.id) NULL
- first_name VARCHAR(255)
- last_name VARCHAR(255)
- email VARCHAR(255)
- phone VARCHAR(50) NULL
- mobile VARCHAR(50) NULL
- position VARCHAR(255) NULL
- avatar VARCHAR(255) NULL
- address TEXT NULL
- city VARCHAR(100) NULL
- country VARCHAR(100) NULL
- postal_code VARCHAR(20) NULL
- birthday DATE NULL
- notes TEXT NULL
- owner_id (FK users.id) NULL
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

### crm_deals
Deal-ovi (prodajni pipeline)
```sql
- id (PK)
- title VARCHAR(255)
- company_id (FK crm_companies.id) NULL
- contact_id (FK crm_contacts.id) NULL
- value DECIMAL(15,2) DEFAULT 0
- currency VARCHAR(10) DEFAULT 'BAM'
- stage VARCHAR(50) DEFAULT 'lead'
- probability INT DEFAULT 0
- expected_close_date DATE NULL
- actual_close_date DATE NULL
- description TEXT NULL
- owner_id (FK users.id) NULL
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

### crm_activities
Aktivnosti (pozivi, sastanci, emailovi)
```sql
- id (PK)
- type VARCHAR(50)
- subject VARCHAR(255)
- description TEXT NULL
- company_id (FK crm_companies.id) NULL
- contact_id (FK crm_contacts.id) NULL
- deal_id (FK crm_deals.id) NULL
- scheduled_at TIMESTAMP NULL
- completed_at TIMESTAMP NULL
- duration INT NULL
- location VARCHAR(255) NULL
- attendees JSON NULL
- owner_id (FK users.id)
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

---

## 4. PROJECT MANAGEMENT (Modul 3)

### projects
Projekti
```sql
- id (PK)
- name VARCHAR(255)
- description TEXT NULL
- client_id (FK crm_companies.id) NULL
- status VARCHAR(50) DEFAULT 'planning'
- priority VARCHAR(50) DEFAULT 'medium'
- start_date DATE NULL
- end_date DATE NULL
- budget DECIMAL(15,2) NULL
- currency VARCHAR(10) DEFAULT 'BAM'
- progress INT DEFAULT 0
- cover_image VARCHAR(255) NULL
- owner_id (FK users.id)
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

### project_members
Članovi projekta
```sql
- id (PK)
- project_id (FK projects.id)
- user_id (FK users.id)
- role VARCHAR(50) DEFAULT 'member'
- can_edit BOOLEAN DEFAULT false
- can_delete BOOLEAN DEFAULT false
- joined_at TIMESTAMP
```

### tasks
Taskovi
```sql
- id (PK)
- project_id (FK projects.id)
- parent_task_id (FK tasks.id) NULL
- title VARCHAR(255)
- description TEXT NULL
- status VARCHAR(50) DEFAULT 'todo'
- priority VARCHAR(50) DEFAULT 'medium'
- assigned_to (FK users.id) NULL
- start_date DATE NULL
- due_date DATE NULL
- completed_at TIMESTAMP NULL
- estimated_hours DECIMAL(8,2) NULL
- actual_hours DECIMAL(8,2) NULL
- order INT DEFAULT 0
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

### task_dependencies
Zavisnosti taskova
```sql
- id (PK)
- task_id (FK tasks.id)
- depends_on_task_id (FK tasks.id)
- type VARCHAR(50) DEFAULT 'finish_to_start'
```

### task_attachments
Prilozi taskova
```sql
- id (PK)
- task_id (FK tasks.id)
- file_name VARCHAR(255)
- file_path VARCHAR(255)
- file_size BIGINT
- mime_type VARCHAR(100)
- uploaded_by (FK users.id)
- created_at TIMESTAMP
```

### task_comments
Komentari na taskove
```sql
- id (PK)
- task_id (FK tasks.id)
- user_id (FK users.id)
- comment TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## 5. DMS - DOCUMENT MANAGEMENT SYSTEM (Modul 4)

### dms_folders
Folderi
```sql
- id (PK)
- parent_folder_id (FK dms_folders.id) NULL
- name VARCHAR(255)
- description TEXT NULL
- color VARCHAR(20) NULL
- icon VARCHAR(50) NULL
- is_shared BOOLEAN DEFAULT false
- owner_id (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

### dms_documents
Dokumenti
```sql
- id (PK)
- folder_id (FK dms_folders.id) NULL
- name VARCHAR(255)
- description TEXT NULL
- file_name VARCHAR(255)
- file_path VARCHAR(255)
- file_size BIGINT
- mime_type VARCHAR(100)
- version INT DEFAULT 1
- is_locked BOOLEAN DEFAULT false
- locked_by (FK users.id) NULL
- locked_at TIMESTAMP NULL
- tags JSON NULL
- owner_id (FK users.id)
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

### dms_document_versions
Verzije dokumenata
```sql
- id (PK)
- document_id (FK dms_documents.id)
- version INT
- file_name VARCHAR(255)
- file_path VARCHAR(255)
- file_size BIGINT
- changes TEXT NULL
- uploaded_by (FK users.id)
- created_at TIMESTAMP
```

### dms_permissions
Dozvole za dokumente/foldere
```sql
- id (PK)
- permissionable_type VARCHAR(255)
- permissionable_id BIGINT UNSIGNED
- user_id (FK users.id) NULL
- role_id (FK roles.id) NULL
- permission VARCHAR(50)
- created_at TIMESTAMP
```

### dms_share_links
Share linkovi
```sql
- id (PK)
- document_id (FK dms_documents.id)
- token VARCHAR(255) UNIQUE
- password VARCHAR(255) NULL
- expires_at TIMESTAMP NULL
- download_count INT DEFAULT 0
- max_downloads INT NULL
- is_active BOOLEAN DEFAULT true
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## 6. LMS - LEARNING MANAGEMENT SYSTEM (Modul 5)

### lms_courses
Kursevi
```sql
- id (PK)
- title VARCHAR(255)
- description TEXT NULL
- cover_image VARCHAR(255) NULL
- category VARCHAR(100) NULL
- level VARCHAR(50) DEFAULT 'beginner'
- duration INT NULL
- is_published BOOLEAN DEFAULT false
- is_featured BOOLEAN DEFAULT false
- instructor_id (FK users.id)
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

### lms_lessons
Lekcije
```sql
- id (PK)
- course_id (FK lms_courses.id)
- title VARCHAR(255)
- description TEXT NULL
- content LONGTEXT NULL
- video_url VARCHAR(255) NULL
- duration INT NULL
- order INT DEFAULT 0
- is_published BOOLEAN DEFAULT false
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### lms_lesson_attachments
Prilozi lekcija
```sql
- id (PK)
- lesson_id (FK lms_lessons.id)
- file_name VARCHAR(255)
- file_path VARCHAR(255)
- file_size BIGINT
- mime_type VARCHAR(100)
- created_at TIMESTAMP
```

### lms_quizzes
Testovi
```sql
- id (PK)
- course_id (FK lms_courses.id)
- title VARCHAR(255)
- description TEXT NULL
- passing_score INT DEFAULT 70
- time_limit INT NULL
- max_attempts INT NULL
- order INT DEFAULT 0
- is_published BOOLEAN DEFAULT false
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### lms_quiz_questions
Pitanja
```sql
- id (PK)
- quiz_id (FK lms_quizzes.id)
- question TEXT
- type VARCHAR(50) DEFAULT 'multiple_choice'
- options JSON NULL
- correct_answer TEXT
- points INT DEFAULT 1
- order INT DEFAULT 0
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### lms_enrollments
Upisi u kurseve
```sql
- id (PK)
- course_id (FK lms_courses.id)
- user_id (FK users.id)
- enrolled_at TIMESTAMP
- completed_at TIMESTAMP NULL
- progress INT DEFAULT 0
```

### lms_lesson_progress
Progres lekcija
```sql
- id (PK)
- lesson_id (FK lms_lessons.id)
- user_id (FK users.id)
- completed_at TIMESTAMP NULL
- created_at TIMESTAMP
```

### lms_quiz_attempts
Pokušaji testova
```sql
- id (PK)
- quiz_id (FK lms_quizzes.id)
- user_id (FK users.id)
- score DECIMAL(5,2)
- passed BOOLEAN DEFAULT false
- answers JSON NULL
- started_at TIMESTAMP
- completed_at TIMESTAMP NULL
```

### lms_certificates
Sertifikati
```sql
- id (PK)
- course_id (FK lms_courses.id)
- user_id (FK users.id)
- certificate_number VARCHAR(100) UNIQUE
- issued_at TIMESTAMP
- expires_at TIMESTAMP NULL
- file_path VARCHAR(255) NULL
```

---

## 7. HRM - HUMAN RESOURCE MANAGEMENT (Modul 6)

### hrm_departments
Odjeli
```sql
- id (PK)
- name VARCHAR(255)
- description TEXT NULL
- manager_id (FK users.id) NULL
- parent_department_id (FK hrm_departments.id) NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### hrm_employees
Zaposlenici
```sql
- id (PK)
- user_id (FK users.id) UNIQUE
- employee_number VARCHAR(50) UNIQUE
- department_id (FK hrm_departments.id) NULL
- position VARCHAR(255)
- employment_type VARCHAR(50) DEFAULT 'full_time'
- hire_date DATE
- termination_date DATE NULL
- salary DECIMAL(15,2) NULL
- currency VARCHAR(10) DEFAULT 'BAM'
- manager_id (FK users.id) NULL
- emergency_contact JSON NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### hrm_leave_types
Tipovi odsustva
```sql
- id (PK)
- name VARCHAR(255)
- description TEXT NULL
- days_per_year INT DEFAULT 0
- is_paid BOOLEAN DEFAULT true
- requires_approval BOOLEAN DEFAULT true
- color VARCHAR(20) NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### hrm_leaves
Odsustva
```sql
- id (PK)
- employee_id (FK hrm_employees.id)
- leave_type_id (FK hrm_leave_types.id)
- start_date DATE
- end_date DATE
- days DECIMAL(4,1)
- reason TEXT NULL
- status VARCHAR(50) DEFAULT 'pending'
- approved_by (FK users.id) NULL
- approved_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### hrm_attendances
Evidencija rada
```sql
- id (PK)
- employee_id (FK hrm_employees.id)
- date DATE
- check_in TIMESTAMP NULL
- check_out TIMESTAMP NULL
- working_hours DECIMAL(4,2) NULL
- status VARCHAR(50) DEFAULT 'present'
- notes TEXT NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### hrm_evaluations
Evaluacije zaposlenika
```sql
- id (PK)
- employee_id (FK hrm_employees.id)
- evaluator_id (FK users.id)
- period_start DATE
- period_end DATE
- overall_rating DECIMAL(3,2)
- strengths TEXT NULL
- weaknesses TEXT NULL
- goals TEXT NULL
- comments TEXT NULL
- status VARCHAR(50) DEFAULT 'draft'
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## 8. CHAT / MESSENGER (Modul 7)

### chat_conversations
Konverzacije
```sql
- id (PK)
- type VARCHAR(50) DEFAULT 'private'
- name VARCHAR(255) NULL
- avatar VARCHAR(255) NULL
- project_id (FK projects.id) NULL
- last_message_at TIMESTAMP NULL
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### chat_participants
Učesnici konverzacija
```sql
- id (PK)
- conversation_id (FK chat_conversations.id)
- user_id (FK users.id)
- last_read_at TIMESTAMP NULL
- is_muted BOOLEAN DEFAULT false
- joined_at TIMESTAMP
```

### chat_messages
Poruke
```sql
- id (PK)
- conversation_id (FK chat_conversations.id)
- user_id (FK users.id)
- message TEXT NULL
- type VARCHAR(50) DEFAULT 'text'
- reply_to_id (FK chat_messages.id) NULL
- is_edited BOOLEAN DEFAULT false
- edited_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
- deleted_at TIMESTAMP NULL
```

### chat_message_attachments
Prilozi poruka
```sql
- id (PK)
- message_id (FK chat_messages.id)
- file_name VARCHAR(255)
- file_path VARCHAR(255)
- file_size BIGINT
- mime_type VARCHAR(100)
- created_at TIMESTAMP
```

---

## 9. NOTIFIKACIJE (Modul 8)

### notifications
Notifikacije (Laravel default)
```sql
- id UUID PK
- type VARCHAR(255)
- notifiable_type VARCHAR(255)
- notifiable_id BIGINT UNSIGNED
- data TEXT
- read_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### notification_settings
Postavke notifikacija
```sql
- id (PK)
- user_id (FK users.id) UNIQUE
- email_enabled BOOLEAN DEFAULT true
- desktop_enabled BOOLEAN DEFAULT true
- sound_enabled BOOLEAN DEFAULT true
- settings JSON NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## 10. GDPR (Modul 10)

### gdpr_consents
Pristanci
```sql
- id (PK)
- user_id (FK users.id)
- type VARCHAR(100)
- description TEXT NULL
- accepted BOOLEAN DEFAULT false
- ip_address VARCHAR(45) NULL
- user_agent TEXT NULL
- accepted_at TIMESTAMP NULL
- revoked_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### gdpr_data_requests
Zahtjevi za podatke
```sql
- id (PK)
- user_id (FK users.id)
- type VARCHAR(50)
- status VARCHAR(50) DEFAULT 'pending'
- processed_by (FK users.id) NULL
- processed_at TIMESTAMP NULL
- file_path VARCHAR(255) NULL
- expires_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### activity_log
Audit log (Spatie)
```sql
- id (PK)
- log_name VARCHAR(255) NULL
- description TEXT
- subject_type VARCHAR(255) NULL
- subject_id BIGINT UNSIGNED NULL
- causer_type VARCHAR(255) NULL
- causer_id BIGINT UNSIGNED NULL
- properties JSON NULL
- batch_uuid UUID NULL
- event VARCHAR(255) NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## 11. OFFICE 365 INTEGRACIJA (Modul 11)

### office365_connections
Konekcije sa Office 365
```sql
- id (PK)
- user_id (FK users.id) UNIQUE
- access_token TEXT
- refresh_token TEXT
- expires_at TIMESTAMP
- scope TEXT NULL
- email VARCHAR(255)
- is_active BOOLEAN DEFAULT true
- last_sync_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### office365_calendar_sync
Sinkronizacija kalendara
```sql
- id (PK)
- user_id (FK users.id)
- office365_event_id VARCHAR(255)
- local_event_id BIGINT UNSIGNED NULL
- event_data JSON
- synced_at TIMESTAMP
```

---

## 12. PLANIKA (Modul 12)

### planika_departments
PLANIKA odjeli
```sql
- id (PK)
- type VARCHAR(50)
- name VARCHAR(255)
- description TEXT NULL
- manager_id (FK users.id) NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### planika_commercial
Komercijala
```sql
- id (PK)
- department_id (FK planika_departments.id)
- title VARCHAR(255)
- client_id (FK crm_companies.id) NULL
- value DECIMAL(15,2)
- currency VARCHAR(10) DEFAULT 'BAM'
- status VARCHAR(50)
- data JSON NULL
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### planika_finance
Finansije i računovodstvo
```sql
- id (PK)
- department_id (FK planika_departments.id)
- type VARCHAR(50)
- reference_number VARCHAR(100) UNIQUE
- amount DECIMAL(15,2)
- currency VARCHAR(10) DEFAULT 'BAM'
- date DATE
- description TEXT NULL
- data JSON NULL
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### planika_retail
Maloprodaja
```sql
- id (PK)
- department_id (FK planika_departments.id)
- pos_id VARCHAR(100)
- transaction_type VARCHAR(50)
- amount DECIMAL(15,2)
- currency VARCHAR(10) DEFAULT 'BAM'
- items JSON NULL
- transaction_date TIMESTAMP
- created_by (FK users.id)
- created_at TIMESTAMP
```

### planika_marketing
Marketing
```sql
- id (PK)
- department_id (FK planika_departments.id)
- campaign_name VARCHAR(255)
- type VARCHAR(50)
- budget DECIMAL(15,2) NULL
- currency VARCHAR(10) DEFAULT 'BAM'
- start_date DATE NULL
- end_date DATE NULL
- metrics JSON NULL
- created_by (FK users.id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### planika_club_members
PLANIKA Club članovi
```sql
- id (PK)
- member_number VARCHAR(100) UNIQUE
- user_id (FK users.id) NULL
- first_name VARCHAR(255)
- last_name VARCHAR(255)
- email VARCHAR(255)
- phone VARCHAR(50)
- points INT DEFAULT 0
- tier VARCHAR(50) DEFAULT 'basic'
- joined_at TIMESTAMP
- expires_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### planika_club_transactions
PLANIKA Club transakcije
```sql
- id (PK)
- member_id (FK planika_club_members.id)
- type VARCHAR(50)
- points INT
- description TEXT NULL
- reference_id BIGINT UNSIGNED NULL
- created_at TIMESTAMP
```

---

## 13. AI MODUL (Modul 13)

### ai_conversations
AI konverzacije
```sql
- id (PK)
- user_id (FK users.id)
- title VARCHAR(255) NULL
- model VARCHAR(100)
- context JSON NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

### ai_messages
AI poruke
```sql
- id (PK)
- conversation_id (FK ai_conversations.id)
- role VARCHAR(50)
- content TEXT
- tokens INT NULL
- created_at TIMESTAMP
```

### ai_documents
AI procesovani dokumenti
```sql
- id (PK)
- user_id (FK users.id)
- document_id (FK dms_documents.id) NULL
- type VARCHAR(50)
- content LONGTEXT NULL
- embeddings JSON NULL
- metadata JSON NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## INDEKSI I OPTIMIZACIJE

### Preporučeni indeksi:
```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- CRM
CREATE INDEX idx_crm_contacts_company ON crm_contacts(company_id);
CREATE INDEX idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX idx_crm_activities_date ON crm_activities(scheduled_at);

-- Projects
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);

-- Documents
CREATE INDEX idx_dms_documents_folder ON dms_documents(folder_id);
CREATE INDEX idx_dms_documents_owner ON dms_documents(owner_id);

-- Chat
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- Activity Log
CREATE INDEX idx_activity_log_causer ON activity_log(causer_type, causer_id);
CREATE INDEX idx_activity_log_subject ON activity_log(subject_type, subject_id);
```

---

**Ukupno tabela**: ~80+  
**Storage Engine**: InnoDB  
**Encoding**: UTF8MB4  
**Collation**: utf8mb4_unicode_ci

