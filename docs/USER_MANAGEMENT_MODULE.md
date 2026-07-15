# 👥 PlanTim - Modul za Upravljanje Korisnicima

## 📋 Pregled

Moderan i kompletan sistem za upravljanje korisnicima sa naprednim funkcionalnostima i intuitivnim interfejsom.

---

## ✨ Funkcionalnosti

### 1. **Pregled Korisnika**
- ✅ Tabela sa svim korisnicima
- ✅ Paginacija (20 korisnika po stranici)
- ✅ Pretraga po imenu i email-u
- ✅ Filtriranje po statusu i ulozi
- ✅ Sortiranje (najnoviji, najstariji, ime, poslednja prijava)
- ✅ Real-time ažuriranje

### 2. **Statistike**
- 📊 Ukupan broj korisnika
- 📊 Aktivni korisnici
- 📊 Neaktivni korisnici
- 📊 Novi korisnici ovog meseca

### 3. **Upravljanje Korisnicima**

#### Kreiranje Novog Korisnika
- Ime i prezime
- Email adresa (validacija)
- Lozinka (minimum 8 karaktera)
- Telefon (opciono)
- Dodela uloge
- Aktivacija naloga

#### Uređivanje Korisnika
- Izmena svih informacija
- Promena lozinke (opciono)
- Promena statusa (aktivan/neaktivan)
- Izmena uloge

#### Brisanje Korisnika
- Zaštita od brisanja sopstvenog naloga
- Potvrda pre brisanja
- Instant feedback

### 4. **Detaljni Pregled Korisnika**

#### Tab: Osnovne Informacije
- Puni profil korisnika
- Email, telefon, ID
- Datum kreiranja
- Poslednja prijava
- Status naloga

#### Tab: Aktivnost
- Log aktivnosti korisnika
- Istorija prijava
- IP adrese
- Timestamp za svaku aktivnost

#### Tab: Dozvole
- Lista svih dozvola korisnika
- Grupisano po modulima
- Vizuelni prikaz

### 5. **Dodela Uloga (Role Assignment)**
- Modal za brzu dodelu uloge
- Prikaz trenutne uloge
- Lista svih dostupnih uloga
- Prikaz dozvola za svaku ulogu
- Instant primena

### 6. **Masovne Akcije (Bulk Actions)**
- ✅ Selekcija više korisnika
- ✅ "Select All" opcija
- ✅ Masovna aktivacija
- ✅ Masovna deaktivacija
- ✅ Masovno brisanje
- ✅ Floating action bar

### 7. **Napredni Filteri**
- Status filter (svi/aktivni/neaktivni)
- Filter po ulozi
- Sortiranje po više kriterijuma
- Reset filtera
- Persistence filtera

### 8. **Export i Import**
- Export korisnika u CSV/Excel
- Bulk import korisnika
- Template za import

### 9. **Toggle Status**
- Brza aktivacija/deaktivacija
- Klik na status badge
- Visual feedback
- Toast notifikacije

---

## 🎨 UI/UX Karakteristike

### Design
- ✨ Moderan i čist dizajn
- 🌙 Dark mode podrška
- 📱 Potpuno responsive
- 🎯 Intuitivna navigacija
- 💫 Smooth animacije

### Interakcije
- Hover efekti
- Loading states
- Toast notifikacije
- Confirmation modali
- Error handling

### Accessibility
- Keyboard navigacija
- ARIA labele
- Focus indicators
- Screen reader friendly

---

## 🔧 Tehnička Implementacija

### Frontend Komponente

```
frontend/src/modules/admin/
├── pages/
│   ├── AdminOverview.tsx        # Glavni admin dashboard
│   └── UserManagement.tsx       # User management stranica
└── components/
    ├── UserModal.tsx            # Create/Edit modal
    ├── UserDetailsModal.tsx     # Detaljan pregled
    ├── RoleAssignModal.tsx      # Dodela uloga
    ├── BulkActionsBar.tsx       # Masovne akcije
    └── UserFilters.tsx          # Filter komponenta
```

### Backend API Endpoints

```
GET    /api/admin/users                 # Lista korisnika
POST   /api/admin/users                 # Kreiranje korisnika
PUT    /api/admin/users/{id}            # Ažuriranje korisnika
DELETE /api/admin/users/{id}            # Brisanje korisnika
POST   /api/admin/users/{id}/assign-role # Dodela uloge
GET    /api/admin/roles                 # Lista uloga
GET    /api/admin/permissions           # Lista dozvola
```

### State Management
- React hooks (useState, useEffect)
- Local component state
- API integration sa apiService
- Toast notifikacije sa react-hot-toast

---

## 📊 Data Flow

### Učitavanje Korisnika
```
1. Component mount
2. fetchUsers() sa paginacijom i filterima
3. API call: GET /api/admin/users?page=1&search=...
4. Ažuriranje state-a (users, pagination, stats)
5. Render table
```

### Kreiranje Korisnika
```
1. Klik na "Novi Korisnik"
2. Otvara se UserModal
3. Popunjavanje forme
4. Submit: POST /api/admin/users
5. Toast notifikacija
6. Refresh tabele
7. Zatvaranje modala
```

### Masovne Akcije
```
1. Selekcija korisnika (checkbox)
2. Prikazivanje BulkActionsBar
3. Odabir akcije (Activate/Deactivate/Delete)
4. Confirmation
5. Promise.all() za sve selektovane
6. Toast notifikacija
7. Refresh tabele
8. Reset selekcije
```

---

## 🎯 Use Cases

### 1. HR Manager dodaje novog zaposlenog
```
Scenario: HR Manager želi da doda novog zaposlenog u sistem

Koraci:
1. Otvori Admin > Upravljanje Korisnicima
2. Klikne "Novi Korisnik"
3. Popuni formu:
   - Ime: John Doe
   - Email: john.doe@company.com
   - Password: generisana lozinka
   - Telefon: +387 XX XXX XXX
   - Uloga: Employee
   - Status: Aktivan
4. Klikne "Kreiraj Korisnika"
5. Sistem kreira korisnika i prikazuje success poruku
6. Korisnik se pojavljuje u listi
```

### 2. Admin deaktivira korisnika koji je napustio kompaniju
```
Scenario: Zaposleni je napustio kompaniju

Koraci:
1. Pronađi korisnika u tabeli
2. Klikni na status badge "Aktivan"
3. Status se menja u "Neaktivan"
4. Korisnik više ne može pristupiti sistemu
```

### 3. Super Admin dodeljuje admin ulogu korisniku
```
Scenario: Potrebno je promovisati korisnika u admina

Koraci:
1. Pronađi korisnika u listi
2. Klikni na shield ikonu (Dodeli Ulogu)
3. Otvara se RoleAssignModal
4. Izaberi ulogu "Admin"
5. Pregled dozvola za admin ulogu
6. Klikni "Dodeli Ulogu"
7. Korisnik dobija admin dozvole
```

### 4. Masovno brisanje test korisnika
```
Scenario: Nakon testiranja potrebno je obrisati test naloge

Koraci:
1. Pretraži "test" u search baru
2. Select all (checkbox u header-u)
3. Prikazuje se Bulk Actions Bar
4. Klikni "Obriši"
5. Potvrdi brisanje
6. Svi test korisnici obrisani
```

---

## 🔒 Sigurnost

### Autorizacija
- Samo admin i super-admin mogu pristupiti
- RBAC provera na backend-u
- Middleware: `role:admin|super-admin`

### Validacija
- Email format validacija
- Password minimum 8 karaktera
- Unique email constraint
- XSS prevention
- CSRF zaštita

### Zaštita
- Ne može se obrisati sopstveni nalog
- Confirmation za kritične akcije
- Rate limiting na API-ju
- Input sanitization

---

## 📱 Responsive Dizajn

### Desktop (1024px+)
- Puna tabela sa svim kolonama
- 4-column grid za statistike
- Side-by-side modali

### Tablet (768px - 1023px)
- 2-column grid za statistike
- Skrivene manje važne kolone
- Stack-ovani modali

### Mobile (< 768px)
- 1-column grid
- Card view umesto tabele
- Full-screen modali
- Hamburger menu za akcije

---

## 🎨 Color Scheme

### Status Colors
- **Aktivni:** Zelena (#10B981)
- **Neaktivni:** Crvena (#EF4444)
- **Pending:** Žuta (#F59E0B)

### Action Colors
- **View:** Plava (#3B82F6)
- **Edit:** Žuta (#F59E0B)
- **Delete:** Crvena (#EF4444)
- **Assign Role:** Ljubičasta (#8B5CF6)

---

## ⚡ Performance

### Optimizacije
- Lazy loading komponenti
- Debounced search (300ms)
- Paginated results (20 per page)
- Memoized calculations
- Efficient re-renders

### Caching
- Role list caching
- Permission list caching
- User data invalidation na update

---

## 🐛 Error Handling

### Frontend
- Try-catch blocks
- Toast notifikacije za greške
- Fallback UI za failed states
- Loading indicators

### Backend
- Validation errors (422)
- Authorization errors (403)
- Not found errors (404)
- Server errors (500)

---

## 🚀 Buduće Funkcionalnosti

### V2.0 (Planirano)
- [ ] Advanced search sa više kriterijuma
- [ ] User groups
- [ ] Bulk import CSV
- [ ] Email notifications za nove korisnike
- [ ] Password reset link generisanje
- [ ] 2FA (Two-factor authentication)
- [ ] Session management
- [ ] Audit log export
- [ ] User profile pictures upload
- [ ] Custom fields za korisnike

### V3.0 (Ideje)
- [ ] LDAP/Active Directory integration
- [ ] SSO (Single Sign-On)
- [ ] OAuth2 provideri
- [ ] Advanced RBAC sa custom permissions
- [ ] Workflow approval za nove korisnike
- [ ] Auto-deactivation nakon X dana neaktivnosti
- [ ] User analytics dashboard
- [ ] AI-powered anomaly detection

---

## 📖 Primeri Koda

### Kreiranje Korisnika

```typescript
const handleCreateUser = async (userData: UserData) => {
  try {
    await apiService.post('/admin/users', {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      is_active: userData.is_active,
    });
    toast.success('Korisnik uspešno kreiran');
    fetchUsers();
  } catch (error) {
    toast.error('Greška pri kreiranju korisnika');
  }
};
```

### Masovne Akcije

```typescript
const handleBulkDelete = async () => {
  if (!confirm(`Obrisati ${selectedUsers.length} korisnika?`)) return;
  
  try {
    await Promise.all(
      selectedUsers.map(id => apiService.delete(`/admin/users/${id}`))
    );
    toast.success(`${selectedUsers.length} korisnika obrisano`);
    setSelectedUsers([]);
    fetchUsers();
  } catch (error) {
    toast.error('Greška pri brisanju korisnika');
  }
};
```

---

## 🎓 Best Practices

### Kod
- ✅ TypeScript za type safety
- ✅ Reusable komponente
- ✅ Clean kod sa komentarima
- ✅ Error boundaries
- ✅ Proper state management

### UX
- ✅ Loading states
- ✅ Empty states
- ✅ Error states
- ✅ Success feedback
- ✅ Keyboard shortcuts

### Accessibility
- ✅ Semantic HTML
- ✅ ARIA attributes
- ✅ Focus management
- ✅ Screen reader support
- ✅ Color contrast

---

## 📞 Podrška

Za pitanja, bug reports ili feature requests:
- Email: support@plantim.com
- GitHub Issues: [link]
- Dokumentacija: [link]

---

**Verzija:** 1.0.0  
**Poslednje Ažuriranje:** 2025-11-18  
**Autor:** PlanTim Development Team






