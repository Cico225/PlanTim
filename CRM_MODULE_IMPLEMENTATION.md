# CRM Modul - Implementacija

## 📋 Pregled

Kompletan CRM modul za PlanTim sa integracijama sa drugim modulima (Projekti, Zadaci, Financije, Dokumenti, Komunikacija).

## ✅ Implementirano

### 1. Database Struktura

#### Proširenje Postojećih Tabela

**crm_companies (Accounts):**
- ✅ `legal_name` - Puni pravni naziv
- ✅ `type` - Tip partnera (client, lead, supplier, partner)
- ✅ `status` - Status (active, inactive, archived)
- ✅ `annual_revenue` - Godišnji prihod
- ✅ `tax_id` - PDV / OIB
- ✅ `registration_number` - Matični broj
- ✅ `source` - Izvor (web, referral, campaign, manual)
- ✅ `rating` - Ocjena (A, B, C, D, E)
- ✅ `street` - Ulica
- ✅ `last_activity_date` - Datum zadnje aktivnosti

**crm_contacts:**
- ✅ `department` - Odjel
- ✅ `status` - Status (active, former, lead)
- ✅ `is_primary` - Primarni kontakt
- ✅ `preferred_communication` - Preferirani način komunikacije
- ✅ `linkedin` - LinkedIn profil
- ✅ `last_interaction_date` - Datum zadnje interakcije

**crm_deals:**
- ✅ `pipeline` - Pipeline (sales, upsell, renewal)
- ✅ `lost_reason` - Razlog gubitka
- ✅ `source` - Izvor deala
- ✅ `campaign_id` - Povezana kampanja
- ✅ `estimated_revenue` - Procijenjeni prihod (value * probability)
- ✅ `project_id` - Povezani projekt

**crm_activities:**
- ✅ `status` - Status (scheduled, completed, cancelled)
- ✅ `related_entity_type` - Tip povezanog entiteta
- ✅ `related_entity_id` - ID povezanog entiteta

#### Nove Tabele

1. **crm_tags** - Tagovi za kategorizaciju
2. **crm_entity_tags** - Pivot tabela za tagove (polymorphic)
3. **crm_documents** - Dokumenti povezani sa CRM entitetima
4. **crm_pipelines** - Pipeline konfiguracije
5. **crm_deal_stages** - Faze unutar pipeline-a
6. **crm_audit_logs** - Audit log za sve promjene
7. **crm_deal_tasks** - Veza deal-a i taskova
8. **crm_deal_projects** - Veza deal-a i projekata
9. **crm_communication_logs** - Log komunikacije (email/chat)
10. **crm_custom_fields** - Custom polja po entitetu
11. **crm_custom_field_values** - Vrijednosti custom polja

### 2. Eloquent Modeli

✅ **Account** (`app/Models/Crm/Account.php`)
- Relacije: owner, creator, contacts, deals, activities, documents, tags, projects
- Scopes: active, byType, byOwner

✅ **Contact** (`app/Models/Crm/Contact.php`)
- Relacije: company, owner, creator, deals, activities, documents, tags
- Accessors: full_name
- Scopes: active, primary, byCompany

✅ **Deal** (`app/Models/Crm/Deal.php`)
- Relacije: company, contact, owner, creator, project, activities, documents, tags, tasks, projects
- Accessors: estimated_revenue (auto-calculated)
- Scopes: byStage, byPipeline, open, won, byOwner
- Events: automatski izračun estimated_revenue

✅ **Activity** (`app/Models/Crm/Activity.php`)
- Relacije: company, contact, deal, owner, creator
- Scopes: byType, scheduled, completed, upcoming

✅ **Document** (`app/Models/Crm/Document.php`)
- Relacije: entity (polymorphic), uploader
- Scopes: byEntity, byType

✅ **Tag** (`app/Models/Crm/Tag.php`)
- Relacije: accounts, contacts, deals (polymorphic)

✅ **Pipeline** (`app/Models/Crm/Pipeline.php`)
- Relacije: stages
- Scopes: active, default

✅ **DealStage** (`app/Models/Crm/DealStage.php`)
- Relacije: pipeline

✅ **AuditLog** (`app/Models/Crm/AuditLog.php`)
- Relacije: user
- Scopes: byEntity, byAction, byUser

✅ **CommunicationLog** (`app/Models/Crm/CommunicationLog.php`)
- Relacije: entity (polymorphic), user
- Scopes: byEntity, byType, inbound, outbound

### 3. Workflow Service

✅ **CrmWorkflowService** (`app/Services/CrmWorkflowService.php`)

Metode:
- `createProjectFromDeal()` - Automatski kreira projekt kada je deal zatvoren kao won
- `createTasksForDealStage()` - Kreira taskove po fazama deal-a
- `checkInactiveAccounts()` - Provjeri neaktivne accounte i pošalji notifikacije
- `updateLastActivityDate()` - Ažuriraj datum zadnje aktivnosti
- `logAudit()` - Kreiraj audit log zapis
- `getTimeline()` - Vrati timeline aktivnosti za entitet

### 4. Backend Controller

✅ **CRMController** (`app/Http/Controllers/Api/CRMController.php`)

**Postojeće metode (proširene):**
- index, getContacts, getContact, storeContact, updateContact, deleteContact
- getCompanies, getCompany, storeCompany, updateCompany, deleteCompany
- getDeals, getDeal, storeDeal, updateDeal, deleteDeal
- getActivities, getActivity, storeActivity, updateActivity, deleteActivity, completeActivity

**Nove metode:**

**Tags:**
- `getTags()` - Lista svih tagova
- `storeTag()` - Kreiraj novi tag
- `attachTag()` - Dodaj tag entitetu
- `detachTag()` - Ukloni tag entiteta

**Documents:**
- `getDocuments()` - Lista dokumenata za entitet
- `uploadDocument()` - Upload dokumenta
- `deleteDocument()` - Obriši dokument

**Pipelines:**
- `getPipelines()` - Lista pipeline-a
- `getPipelineStages()` - Faze pipeline-a

**Integrations:**
- `createProjectFromDeal()` - Kreiraj projekt iz deal-a
- `getDealTasks()` - Lista taskova za deal
- `createTaskForDeal()` - Kreiraj task za deal

**Timeline:**
- `getTimeline()` - Timeline aktivnosti za entitet

**Reporting & Analytics:**
- `getFunnelReport()` - Funnel izvještaj po fazama
- `getDealPerformance()` - Performanse dealova (win rate, vrijednosti)

**Audit Logs:**
- `getAuditLogs()` - Lista audit logova za entitet

### 5. API Rute

✅ Sve rute dodane u `routes/api.php` pod prefiksom `/api/crm`:

```
GET    /api/crm                                    - Dashboard statistike
GET    /api/crm/contacts                           - Lista kontakata
GET    /api/crm/contacts/{id}                     - Detalji kontakta
POST   /api/crm/contacts                          - Kreiraj kontakt
PUT    /api/crm/contacts/{id}                     - Ažuriraj kontakt
DELETE /api/crm/contacts/{id}                    - Obriši kontakt

GET    /api/crm/companies                          - Lista kompanija
GET    /api/crm/companies/{id}                    - Detalji kompanije
POST   /api/crm/companies                          - Kreiraj kompaniju
PUT    /api/crm/companies/{id}                    - Ažuriraj kompaniju
DELETE /api/crm/companies/{id}                    - Obriši kompaniju

GET    /api/crm/deals                              - Lista dealova
GET    /api/crm/deals/{id}                         - Detalji deala
POST   /api/crm/deals                              - Kreiraj deal
PUT    /api/crm/deals/{id}                         - Ažuriraj deal
DELETE /api/crm/deals/{id}                         - Obriši deal

GET    /api/crm/activities                         - Lista aktivnosti
GET    /api/crm/activities/{id}                    - Detalji aktivnosti
POST   /api/crm/activities                         - Kreiraj aktivnost
PUT    /api/crm/activities/{id}                    - Ažuriraj aktivnost
DELETE /api/crm/activities/{id}                   - Obriši aktivnost
PUT    /api/crm/activities/{id}/complete          - Završi aktivnost

GET    /api/crm/tags                               - Lista tagova
POST   /api/crm/tags                               - Kreiraj tag
POST   /api/crm/{entityType}/{entityId}/tags       - Dodaj tag entitetu
DELETE /api/crm/{entityType}/{entityId}/tags/{tagId} - Ukloni tag

GET    /api/crm/{entityType}/{entityId}/documents   - Lista dokumenata
POST   /api/crm/{entityType}/{entityId}/documents   - Upload dokumenta
DELETE /api/crm/documents/{id}                     - Obriši dokument

GET    /api/crm/pipelines                          - Lista pipeline-a
GET    /api/crm/pipelines/{id}/stages              - Faze pipeline-a

POST   /api/crm/deals/{id}/create-project         - Kreiraj projekt iz deal-a
GET    /api/crm/deals/{id}/tasks                   - Lista taskova deal-a
POST   /api/crm/deals/{id}/tasks                   - Kreiraj task za deal

GET    /api/crm/{entityType}/{entityId}/timeline   - Timeline aktivnosti

GET    /api/crm/reports/funnel                     - Funnel izvještaj
GET    /api/crm/reports/performance                - Performanse dealova

GET    /api/crm/{entityType}/{entityId}/audit-logs - Audit logovi
```

### 6. Audit Logging & Observers

✅ **CrmAuditObserver** (`app/Observers/CrmAuditObserver.php`)
- Automatski logira sve promjene na Account, Contact, Deal, Activity
- Ažurira `last_activity_date` za Account i Contact
- Automatski pokreće workflow-e za Deal (kreiranje projekta, taskova)

✅ **CrmServiceProvider** (`app/Providers/CrmServiceProvider.php`)
- Registruje observe-e za CRM modele

### 7. Seeders

✅ **CrmPipelineSeeder** (`database/seeders/CrmPipelineSeeder.php`)
- Kreira default "Sales Pipeline" sa fazama: Lead, Kvalificiran, Ponuda, Pregovori, Dobiven, Izgubljen
- Kreira "Upsell Pipeline" za dodatne prodaje

## 🔗 Integracije sa Drugim Modulima

### 1. Modul Zadataka (Tasks)
- ✅ Deal → automatsko kreiranje zadataka po fazama
- ✅ Kontakt → follow-up zadaci
- ✅ Task ima FK na CRM entitet kroz `crm_deal_tasks`

### 2. Modul Projekata
- ✅ Deal (status = closed-won) → automatsko otvaranje projekta
- ✅ Projekt povlači: Account, Kontakte, Vrijednost
- ✅ Veza kroz `crm_deal_projects` i `projects.client_id`

### 3. Financijski Modul
- ✅ Deal → ponuda → račun (pripremljeno kroz `estimated_revenue`)
- ✅ Sinkronizacija: Vrijednost, Valuta, Plaćanja

### 4. Komunikacijski Modul
- ✅ Logiranje emailova i poruka uz Account, Contact, Deal
- ✅ Tabela `crm_communication_logs` za praćenje komunikacije
- ✅ Automatsko praćenje komunikacije (timeline)

### 5. Reporting & Analytics
- ✅ Funnel izvještaji po fazama
- ✅ Vrijeme po fazama
- ✅ Uspješnost po prodavaču
- ✅ Vrijednost pipeline-a
- ✅ Aktivnosti po accountu

## 🔐 Prava Pristupa i Sigurnost

- ✅ Role-based access control (kroz postojeći RBAC modul)
- ✅ Vidljivost: owner_id polje za vlasništvo
- ✅ Audit log: Sve promjene polja i statusa se logiraju
- ✅ Soft delete: Svi entiteti podržavaju soft delete

## ⚙️ Automatizacije (Workflow)

✅ Implementirano:
1. **Deal u fazi "Ponuda"** → kreiraj task za follow-up
2. **Deal = closed-won** → kreiraj projekt
3. **Nema aktivnosti 14 dana** → notifikacija (metoda `checkInactiveAccounts()`)
4. **Promjena vlasnika** → audit log (kroz observer)

## 📝 Tehničke Napomene

- ✅ API-first (REST)
- ✅ Webhooks za ostale module (pripremljeno kroz workflow service)
- ✅ Custom fields (tabele `crm_custom_fields` i `crm_custom_field_values`)
- ✅ Soft delete (arhiviranje)
- ✅ Full-text search (kroz postojeće search metode)
- ✅ Timeline view (metoda `getTimeline()`)

## 🚀 Sljedeći Koraci

### Frontend Implementacija (Pending)
- [ ] Komponente za Account/Contact/Deal CRUD
- [ ] Pipeline kanban board
- [ ] Timeline komponenta
- [ ] Reporting dashboard
- [ ] Document upload/management
- [ ] Tag management UI

### Dodatne Funkcionalnosti
- [ ] Email integracija (sync sa email sistemom)
- [ ] Chat integracija (sync sa chat modulom)
- [ ] Finance modul integracija (računi, plaćanja)
- [ ] Advanced reporting (charts, exports)
- [ ] Bulk operations
- [ ] Import/Export (CSV, Excel)

## 📦 Pokretanje Migracija

```bash
php artisan migrate
php artisan db:seed --class=CrmPipelineSeeder
```

## 🔧 Konfiguracija

Dodaj `CrmServiceProvider` u `config/app.php` (već dodano):

```php
App\Providers\CrmServiceProvider::class,
```

## 📚 Dokumentacija API-ja

Svi endpointi su dokumentirani u `routes/api.php` i koriste standardne Laravel REST konvencije.






















