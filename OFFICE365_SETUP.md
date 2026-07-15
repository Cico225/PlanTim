# Office 365 Integracija - Uputstvo za Konfigurisanje

## Opšte informacije

Office 365 integracija je dostupna **svim korisnicima** aplikacije. Svaki korisnik može da se poveže sa svojim Microsoft/Office 365 nalogom i koristi sledeće funkcionalnosti:
- Slanje emailova preko Outlook-a sa attachmentima
- Pristup kalendaru
- Pristup OneDrive fajlovima
- Pristup SharePoint sajtovima
- Integracija sa Microsoft Teams

## Predugovori

**Za administratora sistema:**
1. Microsoft Azure nalog sa pristupom Azure Portal-u
2. Office 365/Microsoft 365 organizacija (ili Microsoft nalog za lične korisnike)
3. Potrebno je jednom konfigurisati Azure App Registration (uputstvo ispod)

**Za korisnike:**
- Nije potrebno ništa dodatno - samo Microsoft/Office 365 nalog

## Korak 1: Registracija aplikacije u Azure Portal

1. Idite na [Azure Portal](https://portal.azure.com/)
2. U meniju odaberite **Azure Active Directory** ili **Microsoft Entra ID**
3. U levom meniju kliknite na **App registrations**
4. Kliknite na **+ New registration**
5. Popunite formu:
   - **Name**: PlanTim Office 365 Integration (ili bilo koji naziv)
   - **Supported account types**: 
     - Ako je samo za vašu organizaciju: `Accounts in this organizational directory only`
     - Ako treba da radi sa bilo kojim Microsoft nalogom: `Accounts in any organizational directory and personal Microsoft accounts`
   - **Redirect URI**: 
     - Type: `Web`
     - URI: `http://localhost:8000/api/office365/callback` (za lokalni razvoj)
     - Za produkciju, dodajte i produkcijski URL: `https://vashdomen.com/api/office365/callback`
6. Kliknite **Register**

## Korak 2: Dobijanje Client ID i Tenant ID

1. Nakon registracije, bićete preusmereni na **Overview** stranicu aplikacije
2. Kopirajte sledeće vrednosti:
   - **Application (client) ID** - ovo je `OFFICE365_CLIENT_ID`
   - **Directory (tenant) ID** - ovo je `OFFICE365_TENANT_ID`

## Korak 3: Kreiranje Client Secret-a

1. U levom meniju aplikacije kliknite na **Certificates & secrets**
2. U sekciji **Client secrets** kliknite na **+ New client secret**
3. Popunite:
   - **Description**: PlanTim Secret (ili bilo koji opis)
   - **Expires**: Odaberite rok trajanja (preporučeno: 24 months)
4. Kliknite **Add**
5. **VAŽNO**: Kopirajte **Value** sekreta ODMAH (prikazuje se samo jednom)
   - Ovo je `OFFICE365_CLIENT_SECRET`

## Korak 4: Konfigurisanje API Permissions

1. U levom meniju kliknite na **API permissions**
2. Kliknite na **+ Add a permission**
3. Odaberite **Microsoft Graph**
4. Odaberite **Delegated permissions**
5. Dodajte sledeće dozvole:
   - `Mail.Send` - Slanje emailova
   - `Mail.ReadWrite` - Čitanje i pisanje emailova
   - `Calendars.ReadWrite` - Čitanje i pisanje kalendara
   - `Files.ReadWrite.All` - Čitanje i pisanje fajlova (OneDrive/SharePoint)
   - `User.Read` - Čitanje korisničkih profila
   - `offline_access` - Ovo se automatski dodaje kada koristite refresh token
6. Kliknite **Add permissions**
7. **VAŽNO**: Ako koristite samo za vašu organizaciju, kliknite na **Grant admin consent for [Your Organization]** da odobrite dozvole

## Korak 5: Ažuriranje .env fajla

Otvorite `.env` fajl u korenu projekta i ažurirajte sledeće vrednosti:

```env
OFFICE365_CLIENT_ID=your-application-client-id-here
OFFICE365_CLIENT_SECRET=your-client-secret-value-here
OFFICE365_TENANT_ID=your-directory-tenant-id-here
OFFICE365_REDIRECT_URI=http://localhost:8000/api/office365/callback
```

**Napomena**: Za produkciju, zamenite `http://localhost:8000` sa vašim stvarnim domenom.

## Korak 6: Restartovanje aplikacije

Nakon ažuriranja `.env` fajla, restartujte Laravel backend server:

```bash
# Windows
# Zatvorite trenutni server (Ctrl+C) i pokrenite ponovo
php artisan serve
```

## Verifikacija

**Za administratore:**
1. Otvorite aplikaciju u browser-u
2. Prijavite se kao administrator
3. Idite na **Administracija** → **Office 365** (opciono - za pregled konfiguracije)
4. Idite na **Integracije** → **Office 365** u glavnom meniju
5. Kliknite na **Poveži se** dugme
6. Trebali biste biti preusmereni na Microsoft login stranicu
7. Nakon prijave, bićete preusmereni nazad u aplikaciju sa porukom o uspešnom povezivanju

**Za sve korisnike:**
1. Otvorite aplikaciju u browser-u
2. Prijavite se sa svojim korisničkim nalogom
3. U glavnom meniju idite na **Integracije** → **Office 365**
4. Kliknite na **Poveži se** dugme
5. Prijavite se sa svojim Microsoft/Office 365 nalogom
6. Nakon uspešnog povezivanja, možete koristiti Outlook email, kalendar i druge Office 365 servise

## Troubleshooting

### Greška: "Office 365 konfiguracija nije potpuna"
- Proverite da li su svi parametri u `.env` fajlu popunjeni
- Proverite da li nema dodatnih razmaka oko znaka `=`
- Restartujte backend server nakon izmene `.env` fajla

### Greška: "Invalid client"
- Proverite da li je `OFFICE365_CLIENT_ID` ispravno kopiran
- Proverite da li je aplikacija registrovana u istom tenant-u

### Greška: "AADSTS7000215: Invalid client secret"
- Proverite da li je `OFFICE365_CLIENT_SECRET` ispravno kopiran
- Proverite da li secret nije istekao (ako jeste, kreirajte novi)

### Greška: "Redirect URI mismatch"
- Proverite da li je `OFFICE365_REDIRECT_URI` u `.env` fajlu identičan onome koji ste uneli u Azure Portal
- Proverite da li nema dodatnih slasheva (`/`) na kraju URL-a

### Greška: "Insufficient privileges"
- Proverite da li su sve potrebne dozvole dodate u **API permissions**
- Proverite da li je **Admin consent** odobren za vašu organizaciju

## Produkcija

Za produkciju:

1. U Azure Portal-u dodajte produkcijski Redirect URI:
   - `https://vashdomen.com/api/office365/callback`

2. Ažurirajte `.env` fajl:
   ```env
   OFFICE365_REDIRECT_URI=https://vashdomen.com/api/office365/callback
   ```

3. Proverite da li je `APP_URL` u `.env` fajlu podešen na produkcijski URL:
   ```env
   APP_URL=https://vashdomen.com
   ```

4. Osigurajte se da koristite HTTPS (obavezno za OAuth2)

