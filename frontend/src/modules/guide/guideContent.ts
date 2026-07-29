export type GuideStatus = 'live' | 'partial' | 'planned';

export interface GuideStep {
  title: string;
  body: string;
  tip?: string;
  warn?: string;
}

export interface GuideSection {
  id: string;
  category: 'start' | 'platform' | 'planika';
  title: string;
  subtitle: string;
  route?: string;
  status: GuideStatus;
  accent: string;
  icon: string;
  overview: string;
  features: string[];
  steps: GuideStep[];
  related?: string[];
}

export const GUIDE_CATEGORIES = [
  { id: 'start' as const, label: 'Početak', description: 'Prijava, dashboard i osnovna navigacija' },
  { id: 'platform' as const, label: 'PlanTim platforma', description: 'Enterprise moduli dostupni u sistemu' },
  { id: 'planika' as const, label: 'Planika', description: 'Specijalizovani poslovni hubovi Planike' },
];

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'intro',
    category: 'start',
    title: 'Dobrodošli u PlanTim',
    subtitle: 'Šta je PlanTim i kako je organiziran',
    status: 'live',
    accent: 'sky',
    icon: 'spark',
    overview:
      'PlanTim je enterprise kolaboracijska platforma: projekti, CRM, dokumenti, učenje, komunikacija i AI — uz Planika hub za maloprodaju, finansije i HR.',
    features: [
      'Jedinstvena prijava i role-based pristup',
      'Tamna/svijetla tema i višejezičnost',
      'Notifikacije i interne poruke u realnom vremenu',
      'Planika moduli prilagođeni operativnom radu',
    ],
    steps: [
      {
        title: 'Pregledajte module u bočnom meniju',
        body: 'Lijevi sidebar prikazuje samo module za koje imate dozvolu. Planika se može proširiti na podmodule (HR, Finansije, Maloprodaja).',
        tip: 'Na mobilnom uređaju otvorite meni preko ikone u gornjem lijevom uglu.',
      },
      {
        title: 'Koristite pretragu i brze ikone',
        body: 'U gornjoj traci su pretraga, inbox, notifikacije i profil. Edel AI asistent je dostupan za brza pitanja o sistemu.',
      },
      {
        title: 'Otvorite ovo uputstvo kad zatreba',
        body: 'Uputstvo je uvijek dostupno na /uputstvo. Možete ga filtrirati po modulu i pratiti napredak čitanja.',
      },
    ],
  },
  {
    id: 'login',
    category: 'start',
    title: 'Prijava i profil',
    subtitle: 'Pristup nalogu i lična podešavanja',
    route: '/login',
    status: 'live',
    accent: 'indigo',
    icon: 'lock',
    overview: 'Prijava je zaštićena autentifikacijom. Profil omogućava izmjenu podataka, lozinke, teme i jezika.',
    features: ['Prijava email + lozinka', 'Reset lozinke', 'Profil i aktivnost', 'Tema i jezik'],
    steps: [
      {
        title: 'Prijavite se',
        body: 'Unesite poslovni email i lozinku. Po potrebi označite zapamti me. Ako imate 2FA/verifikacijski kod, unesite ga kada se zatraži.',
      },
      {
        title: 'Zaboravljena lozinka',
        body: 'Na login stranici odaberite „Zaboravili ste lozinku?”, unesite email i slijedite link iz poruke.',
        warn: 'Link za reset ističe — zatražite novi ako je istekao.',
      },
      {
        title: 'Uredite profil',
        body: 'Kliknite avatar u sidebaru. Možete ažurirati ime, telefon, avatar, lozinku i pregledati aktivnost sesija.',
      },
    ],
  },
  {
    id: 'dashboard',
    category: 'start',
    title: 'Dashboard',
    subtitle: 'Početni pregled aktivnosti',
    route: '/dashboard',
    status: 'live',
    accent: 'cyan',
    icon: 'grid',
    overview: 'Dashboard je ulazna tačka nakon prijave — brzi uvid u zadatke, poruke i module kojima često pristupate.',
    features: ['Brzi pregled', 'Prečice na module', 'Notifikacije'],
    steps: [
      {
        title: 'Pročitajte welcome traku',
        body: 'Gornja traka pokazuje vaše ime, notifikacije i inbox. Odavde brzo otvarate komunikaciju.',
      },
      {
        title: 'Pređite na modul',
        body: 'Koristite sidebar ili kartice na dashboardu. Planika otvara specijalizovane hubove za operativni rad.',
      },
    ],
  },
  {
    id: 'crm',
    category: 'platform',
    title: 'CRM',
    subtitle: 'Upravljanje klijentima i prodajnim cijevima',
    route: '/crm',
    status: 'live',
    accent: 'orange',
    icon: 'users',
    overview: 'CRM modul služi za evidenciju klijenata, kontakata, prilika i aktivnosti prodajnog tima.',
    features: ['Klijenti i kontakti', 'Prilike / pipeline', 'Aktivnosti i bilješke'],
    steps: [
      { title: 'Otvorite CRM', body: 'Iz sidebara odaberite CRM. Pregledajte listu klijenata ili pipeline prilika.' },
      { title: 'Dodajte klijenta', body: 'Kreirajte novi zapis sa osnovnim podacima firme i kontaktima. Dodajte bilješke i naredne korake.' },
      { title: 'Pratite priliku', body: 'Premjestite priliku kroz faze pipeline-a kako bi tim imao zajednički uvid u status prodaje.' },
    ],
    related: ['projects', 'planika-sales'],
  },
  {
    id: 'projects',
    category: 'platform',
    title: 'Projekti',
    subtitle: 'Planiranje i praćenje zadataka',
    route: '/projects',
    status: 'live',
    accent: 'blue',
    icon: 'briefcase',
    overview: 'Modul projekata omogućava organizaciju rada po projektima, zadacima, rokovima i članovima tima.',
    features: ['Projekti i boardovi', 'Zadaci i rokovi', 'Članovi tima'],
    steps: [
      { title: 'Kreirajte projekat', body: 'Unesite naziv, opis i članove. Definirajte faze ili board kolone.' },
      { title: 'Dodajte zadatke', body: 'Svaki zadatak može imati odgovornu osobu, rok i prioritet. Ažurirajte status kako napreduje.' },
      { title: 'Pratite rokove', body: 'Koristite filtere i notifikacije da ne propustite kritične datume.' },
    ],
  },
  {
    id: 'dms',
    category: 'platform',
    title: 'DMS — Dokumenti',
    subtitle: 'Pohrana, dijeljenje i verzije dokumenata',
    route: '/dms',
    status: 'live',
    accent: 'emerald',
    icon: 'folder',
    overview: 'Document Management System centralizuje dokumente, folder strukturu i dijeljenje unutar organizacije.',
    features: ['Folderi i fajlovi', 'Upload / download', 'Dijeljenje i pregled'],
    steps: [
      { title: 'Pregledajte strukturu', body: 'Otvorite DMS i navigirajte kroz foldere. Koristite pretragu za brzo pronalaženje.' },
      { title: 'Otpremite dokument', body: 'Uploadajte fajl u odgovarajući folder. Dodajte opis ako je potrebno.' },
      { title: 'Podijelite sa timom', body: 'Postavite prava pristupa kako bi relevantni korisnici mogli pregledati ili uređivati dokument.' },
    ],
  },
  {
    id: 'lms',
    category: 'platform',
    title: 'LMS — Učenje',
    subtitle: 'Kursevi, upisi i certifikati',
    route: '/lms',
    status: 'live',
    accent: 'violet',
    icon: 'book',
    overview: 'Learning Management System omogućava kurseve, praćenje napretka i izdavanje certifikata.',
    features: ['Katalog kurseva', 'Upisi i napredak', 'Certifikati'],
    steps: [
      { title: 'Pronađite kurs', body: 'Otvorite LMS katalog i filtrirajte po temi ili statusu.' },
      { title: 'Upišite se / pokrenite lekciju', body: 'Pratite sadržaj lekcija i označite završene cjeline.' },
      { title: 'Preuzmite certifikat', body: 'Nakon uspješnog završetka, certifikat je dostupan u vašem profilu kurseva.' },
    ],
    related: ['planika-hr-education'],
  },
  {
    id: 'inbox',
    category: 'platform',
    title: 'Interne poruke',
    subtitle: 'Komunikacija unutar organizacije',
    route: '/inbox',
    status: 'live',
    accent: 'rose',
    icon: 'mail',
    overview: 'Inbox služi za interne poruke između korisnika PlanTima — bez oslanjanja na vanjski email.',
    features: ['Primljeno / poslano', 'Sastavljanje poruke', 'Nepročitano brojanje'],
    steps: [
      { title: 'Otvorite Inbox', body: 'Ikona koverte u headeru ili stavka u sidebaru vodi na listu poruka.' },
      { title: 'Napišite poruku', body: 'Odaberite primaoca, unesite predmet i sadržaj, zatim pošaljite.' },
      { title: 'Pratite nepročitano', body: 'Badge na ikoni pokazuje broj nepročitanih poruka.' },
    ],
  },
  {
    id: 'notifications',
    category: 'platform',
    title: 'Notifikacije',
    subtitle: 'Sistemska obavještenja',
    route: '/notifications',
    status: 'live',
    accent: 'amber',
    icon: 'bell',
    overview: 'Notifikacije obavještavaju o događajima u modulima: zadaci, odobrenja, rokovi, HR alerti itd.',
    features: ['Centar notifikacija', 'Označavanje pročitanog', 'Prioriteti'],
    steps: [
      { title: 'Otvorite zvono', body: 'Kliknite ikonu zvona u headeru za brzi pregled.' },
      { title: 'Otvori detalj', body: 'Klik na notifikaciju vodi na povezani zapis ili modul.' },
    ],
  },
  {
    id: 'gdpr',
    category: 'platform',
    title: 'GDPR',
    subtitle: 'Privatnost i zaštita podataka',
    route: '/gdpr',
    status: 'live',
    accent: 'slate',
    icon: 'shield',
    overview: 'GDPR modul podržava zahtjeve privatnosti, saglasnosti i evidenciju obrade ličnih podataka.',
    features: ['Zahtjevi subjekata', 'Saglasnosti', 'Evidencija obrade'],
    steps: [
      { title: 'Pregledajte zahtjeve', body: 'Otvorite GDPR i pratite status zahtjeva (pristup, brisanje, prenos).' },
      { title: 'Evidentirajte obradu', body: 'Dokumentujte svrhe obrade i rokove čuvanja u skladu s politikom firme.' },
    ],
  },
  {
    id: 'office365',
    category: 'platform',
    title: 'Office 365',
    subtitle: 'Integracija sa Microsoft 365',
    route: '/office365',
    status: 'partial',
    accent: 'sky',
    icon: 'cloud',
    overview: 'Modul povezuje PlanTim sa Microsoft 365 uslugama (kalendar, mail, dokumenti) gdje je integracija omogućena.',
    features: ['Povezivanje naloga', 'Pregled povezanih servisa'],
    steps: [
      { title: 'Otvorite Office 365', body: 'Provjerite status povezanosti naloga.' },
      { title: 'Autorizujte pristup', body: 'Ako admin omogući, povežite Microsoft nalog i odaberite dozvole.' },
      {
        title: 'Koristite povezane funkcije',
        body: 'Dostupne funkcije zavise od konfiguracije okruženja.',
        tip: 'Za probleme s povezivanjem kontaktirajte administratora.',
      },
    ],
  },
  {
    id: 'ai',
    category: 'platform',
    title: 'AI Asistent (Edel)',
    subtitle: 'Pomoć u radu pomoću AI',
    route: '/ai',
    status: 'live',
    accent: 'fuchsia',
    icon: 'cpu',
    overview: 'Edel AI asistent pomaže sa pitanjima o sistemu, sažimanjem i produktivnim zadacima unutar PlanTima.',
    features: ['Chat asistent', 'Kontekstualna pomoć', 'Brzi odgovori'],
    steps: [
      { title: 'Otvorite AI modul ili floating asistenta', body: 'Možete koristiti /ai ili Edel dugme u layoutu.' },
      { title: 'Postavite pitanje', body: 'Budite konkretni: npr. „Kako kreirati ugovor o radu u HR?”.' },
      { title: 'Provjerite rezultat', body: 'AI daje smjernice — kritične poslovne odluke uvijek potvrdite u odgovarajućem modulu.' },
    ],
  },
  {
    id: 'meeting-rooms',
    category: 'platform',
    title: 'Rezervacija sala',
    subtitle: 'Zauzimanje prostorija za sastanke',
    route: '/meeting-rooms',
    status: 'live',
    accent: 'teal',
    icon: 'calendar',
    overview: 'Modul omogućava pregled dostupnosti i rezervaciju sala za sastanke.',
    features: ['Kalendar sala', 'Rezervacije', 'Konflikt detekcija'],
    steps: [
      { title: 'Odaberite salu i termin', body: 'Pregledajte kalendar i pronađite slobodan slot.' },
      { title: 'Kreirajte rezervaciju', body: 'Unesite naziv sastanka, učesnike i potvrdite.' },
      { title: 'Izmijenite ili otkažite', body: 'Po potrebi ažurirajte termin da oslobodite salu drugima.' },
    ],
  },
  {
    id: 'admin',
    category: 'platform',
    title: 'Administracija',
    subtitle: 'Korisnici, moduli i sistemska podešavanja',
    route: '/admin',
    status: 'live',
    accent: 'red',
    icon: 'settings',
    overview: 'Admin modul je za IT/HR administratore: korisnici, role, moduli, backup i sigurnost.',
    features: ['Korisnici i role', 'Moduli i permissions', 'Backup / sigurnost'],
    steps: [
      { title: 'Upravljajte korisnicima', body: 'Kreirajte naloge, dodijelite role i module.' },
      { title: 'Sinhronizujte module', body: 'Nakon novih Planika podmodula pokrenite modules:sync da permissions budu dostupne.' },
      {
        title: 'Pratite sigurnost',
        body: 'Pregledajte logove, backup i verzije aplikacije.',
        warn: 'Admin akcije utiču na cijelu organizaciju — radite pažljivo.',
      },
    ],
  },
  {
    id: 'planika-overview',
    category: 'planika',
    title: 'Planika — pregled',
    subtitle: 'Hub za maloprodaju, finansije, HR i buduće module',
    route: '/planika',
    status: 'live',
    accent: 'orange',
    icon: 'package',
    overview:
      'Planika je specijalizovani sloj PlanTima. Aktivni hubovi: Maloprodaja, Finansije i HR. Prodaja, Marketing i Klub su u pripremi.',
    features: [
      'Kartice podmodula sa animacijama',
      'Permission-driven pristup',
      'Duboki linkovi u operativne ekrane',
    ],
    steps: [
      {
        title: 'Otvorite /planika',
        body: 'Vidjet ćete kartice: Prodaja, Finansije, Maloprodaja, Marketing, HR, Klub. Aktivni hubovi otvaraju landing stranice.',
      },
      {
        title: 'Uđite u hub',
        body: 'Klik na HR / Finansije / Maloprodaja otvara landing sa panelima. Ostali moduli mogu biti stub dok se ne implementiraju.',
      },
      {
        title: 'Koristite sidebar podmeni',
        body: 'Planika u sidebaru proširuje djecu (npr. Ugovori, Krediti) ako imate dozvolu.',
      },
    ],
    related: ['planika-hr', 'planika-finance', 'planika-retail'],
  },
  {
    id: 'planika-retail',
    category: 'planika',
    title: 'Maloprodaja',
    subtitle: 'Obilasci, kontrole, edukacije i reklamacije',
    route: '/planika/retail',
    status: 'live',
    accent: 'pink',
    icon: 'shop',
    overview:
      'Maloprodaja hub povezuje operativni rad prodavnica: planove obilazaka, evidencije kontrola, edukacije i reklamacije.',
    features: ['Plan i evidencija obilazaka', 'Kontrole', 'Edukacije', 'Reklamacije'],
    steps: [
      {
        title: 'Otvorite Maloprodaja hub',
        body: 'Na /planika/retail odaberite panel za operativni rad ili reklamacije.',
      },
      {
        title: 'Planirajte obilazak',
        body: 'U operativnom dijelu (/maloprodaja) kreirajte plan, dodajte prodavnicu i termin.',
      },
      {
        title: 'Evidentirajte kontrolu',
        body: 'Nakon obilaska unesite rezultate kontrole, napomene i priloge.',
      },
      {
        title: 'Obrada reklamacije',
        body: 'Idite na /planika/retail/reklamacije → Nova reklamacija. Unesite podatke, fotografije i pratite status.',
        tip: 'Fotografije se uploadaju po slotovima — priložite jasne snimke artikla/ambalaže.',
      },
    ],
    related: ['planika-hr-education', 'planika-hr-evaluations'],
  },
  {
    id: 'planika-finance',
    category: 'planika',
    title: 'Finansije i računovodstvo',
    subtitle: 'Krediti (zabrane) i aktivni ugovori',
    route: '/planika/finance',
    status: 'live',
    accent: 'teal',
    icon: 'coin',
    overview:
      'Finansijski hub Planike pokriva administrativne zabrane (krediti) i evidenciju firmi sa aktivnim ugovorima.',
    features: ['Krediti — zabrane', 'Uvoz / sken / izvještaj', 'Spiskovi aktivnih ugovora'],
    steps: [
      {
        title: 'Otvorite Finansije',
        body: 'Na /planika/finance odaberite Krediti ili Spiskovi aktivnih ugovora.',
      },
      {
        title: 'Krediti — lista i uvoz',
        body: 'U Krediti pregledajte zabrane, uploadajte fajlove i koristite sken/uparivanje gdje je dostupno.',
      },
      {
        title: 'Izvještaji zabrana',
        body: 'Generišite i eksportujte izvještaj za administrativne zabrane.',
      },
      {
        title: 'Aktivni ugovori',
        body: 'U Ugovori vodite firme sa potpisanim ugovorom, spiskove uposlenika i Excel uvoz.',
      },
    ],
  },
  {
    id: 'planika-hr',
    category: 'planika',
    title: 'HR — Ljudski resursi',
    subtitle: 'Kompletan HR lifecycle u Planici',
    route: '/planika/hr',
    status: 'live',
    accent: 'green',
    icon: 'hr',
    overview:
      'HR hub obuhvata zaposlene, ATS, onboarding, ugovore, odsustva, edukacije, talent, evaluacije, offboarding i izvještaje.',
    features: [
      '14 panela na timeline landing stranici',
      'Dozvole po podmodulu',
      'Integracija sa zaposlenicima i prodavnicama',
    ],
    steps: [
      {
        title: 'Otvorite HR landing',
        body: 'Na /planika/hr vidite timeline panela. Klik na panel otvara taj podmodul.',
      },
      {
        title: 'Počnite od Pregleda',
        body: 'Dashboard pokazuje KPI: zaposleni, odsustva, onboarding, ugovori koji ističu.',
      },
      {
        title: 'Kreirajte master podatke',
        body: 'Prije ugovora/edukacija provjerite Zaposlene, Odjele i Prodavnice.',
        tip: 'Bez zaposlenika u bazi ne možete prijaviti edukaciju ni talent profil.',
      },
    ],
    related: [
      'planika-hr-ats',
      'planika-hr-contracts',
      'planika-hr-education',
      'planika-hr-talent',
    ],
  },
  {
    id: 'planika-hr-employees',
    category: 'planika',
    title: 'HR — Zaposleni i odjeli',
    subtitle: 'Master podaci organizacije',
    route: '/planika/hr/employees',
    status: 'live',
    accent: 'green',
    icon: 'users',
    overview: 'Evidencija zaposlenika, statusa, pozicija i organizacijske strukture (odjeli, prodavnice, radna mjesta).',
    features: ['CRUD zaposlenih', 'Import', 'Odjeli / strukture', 'Prodavnice i pozicije'],
    steps: [
      { title: 'Dodajte zaposlenika', body: 'Unesite osnovne podatke, odjel, poziciju i status (active, hiring…).' },
      { title: 'Uredite organizaciju', body: 'U Odjeli održavajte hijerarhiju. Povežite prodavnice i radna mjesta.' },
      { title: 'Import po potrebi', body: 'Za veće količine koristite import funkciju umjesto ručnog unosa.' },
    ],
  },
  {
    id: 'planika-hr-ats',
    category: 'planika',
    title: 'HR — ATS',
    subtitle: 'Pozicije, kandidati, intervjui i ponude',
    route: '/planika/hr/ats',
    status: 'live',
    accent: 'emerald',
    icon: 'briefcase',
    overview: 'Applicant Tracking System prati cijeli tok zapošljavanja od otvorene pozicije do prihvatanja ponude.',
    features: ['Pozicije', 'Kandidati', 'Intervjui', 'Ponude'],
    steps: [
      { title: 'Objavite poziciju', body: 'Kreirajte otvorenu poziciju sa zahtjevima i statusom.' },
      { title: 'Dodajte kandidata', body: 'Unesite CV podatke i povežite sa pozicijom. Pomjerajte kroz pipeline.' },
      { title: 'Zakažite intervju', body: 'Definirajte termin, tip intervjua i evaluatore.' },
      { title: 'Pošaljite ponudu', body: 'Kreirajte ponudu, pošaljite i pratite accept/reject.' },
    ],
    related: ['planika-hr-onboarding'],
  },
  {
    id: 'planika-hr-onboarding',
    category: 'planika',
    title: 'HR — Onboarding',
    subtitle: 'Prijem novih zaposlenika',
    route: '/planika/hr/onboarding',
    status: 'live',
    accent: 'lime',
    icon: 'userPlus',
    overview: 'Onboarding koristi šablone zadataka (dokumenti, IT, oprema, obuka) i prati napredak procesa.',
    features: ['Šabloni', 'Procesi', 'Checklist zadataka', 'Statusi'],
    steps: [
      { title: 'Odaberite zaposlenika i šablon', body: 'Pokrenite onboarding iz liste procesa.' },
      { title: 'Označavajte zadatke', body: 'Kako se zadaci završavaju, napredak % raste.' },
      { title: 'Zatvorite proces', body: 'Kad je sve gotovo, status postavite na completed.' },
    ],
  },
  {
    id: 'planika-hr-contracts',
    category: 'planika',
    title: 'HR — Ugovori o radu',
    subtitle: 'FBiH / RS / BD ugovori i aneksi',
    route: '/planika/hr/contracts',
    status: 'live',
    accent: 'green',
    icon: 'file',
    overview:
      'Modul ugovora prati ugovore po entitetu i ulozi, generiše dokumente (PDF/DOCX), obavještava o isteku i podržava obnovu.',
    features: [
      'Šabloni po entitetu i roli',
      'Generisanje PDF/DOCX',
      'Obnova sa novim rokom',
      'Filteri i summary kartice',
    ],
    steps: [
      {
        title: 'Odaberite šablon',
        body: 'Pri kreiranju odaberite FBiH/RS/BD i ulogu (šef, zamjenik, prodavač). RS koristi DOCX aneks; FBiH/BD PDF.',
      },
      {
        title: 'Unesite podatke ugovora',
        body: 'Datum potpisa, početak/kraj rada, plata, adresa, prodavnica. Možete override-ati polja.',
      },
      {
        title: 'Generišite i preuzmite dokument',
        body: 'Kliknite generiši, zatim preuzmi. Ekstenzija mora odgovarati formatu (.pdf ili .docx).',
        warn: 'Ako Word prijavi „unreadable content”, regenerišite dokument nakon ispravki šablona.',
      },
      {
        title: 'Obnova ugovora',
        body: 'Za istekle/uskoro istekle ugovore koristite Renew — unesite novi krajnji datum i po želji platu/protokol.',
      },
    ],
  },
  {
    id: 'planika-hr-leaves',
    category: 'planika',
    title: 'HR — Odsustva i evidencije',
    subtitle: 'Godišnji, bolovanja i radno vrijeme',
    route: '/planika/hr/leaves',
    status: 'partial',
    accent: 'cyan',
    icon: 'calendar',
    overview: 'Odsustva pokrivaju zahtjeve za godišnji/bolovanje; evidencije rada prate time entry / clock in-out.',
    features: ['Zahtjevi odsustva', 'Odobravanje', 'Time entries'],
    steps: [
      { title: 'Podnesite odsustvo', body: 'Odaberite tip, period i razlog. Status ide na odobrenje.' },
      { title: 'Odobrite / odbijte', body: 'Menadžer ili HR mijenja status zahtjeva.' },
      { title: 'Evidencija rada', body: 'U Attendance pratite dolaske/odlaske zaposlenika.' },
    ],
  },
  {
    id: 'planika-hr-education',
    category: 'planika',
    title: 'HR — Edukacije',
    subtitle: 'Programi, prijave, certifikati i planovi razvoja',
    route: '/planika/hr/education',
    status: 'live',
    accent: 'indigo',
    icon: 'grad',
    overview:
      'Edukacije omogućavaju katalog programa, prijave zaposlenika, automatsko izdavanje certifikata i individualne planove razvoja.',
    features: ['Programi (interna/eksterna/online/workshop)', 'Prijave', 'Certifikati', 'Planovi razvoja'],
    steps: [
      {
        title: 'Kreirajte program',
        body: 'Unesite naziv, tip, termin, organizatora. Uključite „Izdaje certifikat” ako želite auto-certifikat.',
      },
      {
        title: 'Prijavite zaposlenika',
        body: 'U Prijave odaberite program + zaposlenika. Status: planned → in_progress → completed.',
      },
      {
        title: 'Označite završeno',
        body: '„Označi završeno” zatvara prijavu i po potrebi kreira certifikat.',
      },
      {
        title: 'Plan razvoja',
        body: 'Kreirajte individualni plan sa ciljevima i aktivnostima (jedna po liniji).',
      },
    ],
    related: ['lms', 'planika-hr-talent'],
  },
  {
    id: 'planika-hr-talent',
    category: 'planika',
    title: 'HR — Talent Management',
    subtitle: 'Talent pool, karijera, nasljeđivanje, 9-box',
    route: '/planika/hr/talent',
    status: 'live',
    accent: 'amber',
    icon: 'star',
    overview:
      'Talent modul identifikuje ključne ljude: performanse × potencijal, karijerne putanje i planove nasljeđivanja pozicija.',
    features: ['Talent pool', '9-box matrica', 'Karijerne putanje', 'Nasljeđivanje'],
    steps: [
      {
        title: 'Dodajte talent profil',
        body: 'Odaberite zaposlenika, ocjenite performanse i potencijal, unesite snage i područja razvoja.',
      },
      {
        title: 'Pregledajte 9-box',
        body: 'Matrica prikazuje raspodjelu talenata. Gornji desni kvadrant = high/high.',
      },
      {
        title: 'Definišite karijernu putanju',
        body: 'Trenutna → ciljna pozicija, horizont (kratki/srednji/dugi) i ciljni datum.',
      },
      {
        title: 'Plan nasljeđivanja',
        body: 'Za kritičnu poziciju imenujte nasljednika, spremnost i prioritet.',
      },
    ],
  },
  {
    id: 'planika-hr-evaluations',
    category: 'planika',
    title: 'HR — Evaluacije i offboarding',
    subtitle: 'Ocjene performansi i izlazni procesi',
    route: '/planika/hr/evaluations',
    status: 'partial',
    accent: 'yellow',
    icon: 'award',
    overview:
      'Evaluacije bilježe ocjene zaposlenika; offboarding prati zadatke pri odlasku. Dio funkcionalnosti je u razvoju / povezan sa maloprodajnim evaluacijama.',
    features: ['Evaluacije', 'Offboarding checklist', 'Izvještaji (planirano)'],
    steps: [
      { title: 'Otvorite Evaluacije', body: 'Pregledajte postojeće ocjene ili kreirajte novu kada API bude potpun.' },
      { title: 'Offboarding', body: 'Pokrenite proces za zaposlenika koji odlazi i zatvarajte IT/oprema/dokumente zadatke.' },
      {
        title: 'Maloprodajne evaluacije',
        body: 'Operativne GO/NO-GO evaluacije prodavnica dostupne su i u maloprodajnom modulu.',
      },
    ],
  },
  {
    id: 'planika-sales',
    category: 'planika',
    title: 'Planika Prodaja',
    subtitle: 'U pripremi',
    route: '/planika/sales',
    status: 'planned',
    accent: 'orange',
    icon: 'trend',
    overview: 'Prodajni hub Planike (lead management, sync proizvoda, pricing) je planiran i trenutno prikazuje placeholder.',
    features: ['Lead management (plan)', 'Product sync (plan)', 'Pricing rules (plan)'],
    steps: [
      {
        title: 'Pratite status',
        body: 'Modul će biti povezan kada se implementira. Do tada koristite platformski CRM za klijente.',
      },
    ],
    related: ['crm'],
  },
  {
    id: 'planika-marketing',
    category: 'planika',
    title: 'Planika Marketing',
    subtitle: 'U pripremi',
    route: '/planika/marketing',
    status: 'planned',
    accent: 'purple',
    icon: 'megaphone',
    overview: 'Marketing hub (kampanje, segmentacija, content) je u planu razvoja.',
    features: ['Campaign builder (plan)', 'Audience segmentation (plan)', 'Content hub (plan)'],
    steps: [
      { title: 'Pratite roadmap', body: 'Kada modul bude aktivan, ovdje će se pojaviti detaljni koraci rada.' },
    ],
  },
  {
    id: 'planika-club',
    category: 'planika',
    title: 'Planika Klub',
    subtitle: 'Loyalty program — u pripremi',
    route: '/planika/club',
    status: 'planned',
    accent: 'yellow',
    icon: 'star',
    overview: 'Klub/loyalty modul za kampanje nagrada i analitiku članstva je planiran.',
    features: ['Loyalty campaigns (plan)', 'Rewards (plan)', 'Club analytics (plan)'],
    steps: [
      { title: 'Pratite status', body: 'Placeholder kartica na Planika overviewu označava budući modul.' },
    ],
  },
];

export function getGuideSection(id: string) {
  return GUIDE_SECTIONS.find((s) => s.id === id);
}
