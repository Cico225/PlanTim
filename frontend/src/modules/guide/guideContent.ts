export interface GuideStep {
  title: string;
  body: string;
}

export interface GuideSection {
  id: string;
  category: 'start' | 'platform' | 'planika';
  title: string;
  route?: string;
  overview: string;
  steps: GuideStep[];
}

export const GUIDE_CATEGORIES = [
  { id: 'start' as const, label: 'Početak' },
  { id: 'platform' as const, label: 'PlanTim' },
  { id: 'planika' as const, label: 'Planika' },
];

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'intro',
    category: 'start',
    title: 'Kako početi',
    overview: 'PlanTim je poslovna platforma. Lijevi meni prikazuje module za koje imate pristup. Planika je poseban dio za maloprodaju, finansije i HR.',
    steps: [
      { title: 'Prijava', body: 'Unesite email i lozinku. Profil otvorite klikom na avatar u dnu menija.' },
      { title: 'Navigacija', body: 'Koristite lijevi meni. Strelica na rubu menija skuplja ili raširuje sidebar.' },
      { title: 'Pomoć', body: 'Ikona knjige gore desno i Edel AI asistent su uvijek dostupni.' },
    ],
  },
  {
    id: 'crm',
    category: 'platform',
    title: 'CRM',
    route: '/crm',
    overview: 'Upravljanje klijentima i prodajnim prilikama.',
    steps: [
      { title: 'Dodajte klijenta', body: 'Unesite podatke firme i kontakte.' },
      { title: 'Pratite priliku', body: 'Premjestite priliku kroz faze pipeline-a.' },
    ],
  },
  {
    id: 'projects',
    category: 'platform',
    title: 'Projekti',
    route: '/projects',
    overview: 'Organizacija projekata, zadataka i rokova.',
    steps: [
      { title: 'Kreirajte projekat', body: 'Dodajte naziv, članove i zadatke.' },
      { title: 'Ažurirajte status', body: 'Pratite napredak i rokove zadataka.' },
    ],
  },
  {
    id: 'dms',
    category: 'platform',
    title: 'Dokumenti (DMS)',
    route: '/dms',
    overview: 'Pohrana i dijeljenje dokumenata.',
    steps: [
      { title: 'Otpremite fajl', body: 'Odaberite folder i uploadajte dokument.' },
      { title: 'Podijelite', body: 'Postavite ko može vidjeti ili uređivati fajl.' },
    ],
  },
  {
    id: 'lms',
    category: 'platform',
    title: 'Učenje (LMS)',
    route: '/lms',
    overview: 'Kursevi, upisi i certifikati. Hub ima panele Direkcija i Maloprodaja.',
    steps: [
      { title: 'Odaberite panel', body: 'Na /lms otvorite Maloprodaja (postojeći sadržaj) ili Direkcija (u pripremi).' },
      { title: 'Odaberite kurs', body: 'Upišite se i pratite lekcije u maloprodajnom LMS-u.' },
      { title: 'Certifikat', body: 'Nakon završetka preuzmite certifikat.' },
    ],
  },
  {
    id: 'inbox',
    category: 'platform',
    title: 'Poruke i notifikacije',
    route: '/inbox',
    overview: 'Interne poruke i sistemska obavještenja (ikone u gornjoj traci).',
    steps: [
      { title: 'Inbox', body: 'Pošaljite ili pročitajte interne poruke.' },
      { title: 'Notifikacije', body: 'Zvono pokazuje nove događaje iz modula.' },
    ],
  },
  {
    id: 'ai',
    category: 'platform',
    title: 'AI asistent',
    route: '/ai',
    overview: 'Edel pomaže sa pitanjima o radu u PlanTimu.',
    steps: [
      { title: 'Pitajte konkretno', body: 'Npr. „Kako kreirati ugovor u HR?”.' },
    ],
  },
  {
    id: 'admin',
    category: 'platform',
    title: 'Administracija',
    route: '/admin',
    overview: 'Za administratore: korisnici, role, moduli i sistemska podešavanja.',
    steps: [
      { title: 'Korisnici i role', body: 'Kreirajte naloge i dodijelite pristup modulima.' },
    ],
  },
  {
    id: 'planika',
    category: 'planika',
    title: 'Planika — pregled',
    route: '/planika',
    overview: 'Aktivni hubovi: Maloprodaja, Finansije i HR. Ostali (Prodaja, Marketing, Klub) su u pripremi.',
    steps: [
      { title: 'Otvorite hub', body: 'Kliknite karticu na /planika ili stavku u sidebaru.' },
      { title: 'Ulazite u panele', body: 'Svaki hub ima podmodule (npr. HR → Ugovori, Edukacije).' },
    ],
  },
  {
    id: 'retail',
    category: 'planika',
    title: 'Maloprodaja',
    route: '/planika/retail',
    overview: 'Obilasci, kontrole i reklamacije prodavnica.',
    steps: [
      { title: 'Plan obilaska', body: 'Kreirajte plan, dodajte prodavnicu i termin.' },
      { title: 'Kontrola', body: 'Unesite rezultat obilaska i napomene.' },
      { title: 'Reklamacija', body: 'Unos + print (Zaprimljena) → fotografije → slanje u direkciju → Odobrena ili Odbijena.' },
    ],
  },
  {
    id: 'finance',
    category: 'planika',
    title: 'Finansije',
    route: '/planika/finance',
    overview: 'Administrativne zabrane (krediti) i spiskovi aktivnih ugovora.',
    steps: [
      { title: 'Krediti', body: 'Pregled, uvoz i izvještaji zabrana.' },
      { title: 'Ugovori', body: 'Firme sa ugovorom i Excel uvoz spiskova.' },
    ],
  },
  {
    id: 'hr',
    category: 'planika',
    title: 'HR — osnovno',
    route: '/planika/hr',
    overview: 'Zaposleni, ATS, onboarding, ugovori, odsustva, edukacije i talent.',
    steps: [
      { title: 'Landing', body: 'Na /planika/hr kliknite panel koji vam treba.' },
      { title: 'Zaposleni', body: 'Prvo unesite zaposlenike, odjele i prodavnice.' },
      { title: 'Pregled', body: 'Dashboard pokazuje brojke i upozorenja (npr. ugovori koji ističu).' },
    ],
  },
  {
    id: 'hr-ats',
    category: 'planika',
    title: 'HR — zapošljavanje (ATS)',
    route: '/planika/hr/ats',
    overview: 'Pozicije → kandidati → intervjui → ponude.',
    steps: [
      { title: 'Pozicija', body: 'Otvorite poziciju sa zahtjevima.' },
      { title: 'Kandidat', body: 'Dodajte kandidata i pomjerajte kroz faze.' },
      { title: 'Ponuda', body: 'Kreirajte i pošaljite ponudu.' },
    ],
  },
  {
    id: 'hr-contracts',
    category: 'planika',
    title: 'HR — ugovori o radu',
    route: '/planika/hr/contracts',
    overview: 'Ugovori za FBiH, RS i BD. Generisanje PDF/DOCX i obnova.',
    steps: [
      { title: 'Novi ugovor', body: 'Odaberite šablon (entitet + uloga) i unesite podatke.' },
      { title: 'Dokument', body: 'Generišite i preuzmite. FBiH/BD = PDF, RS = DOCX.' },
      { title: 'Obnova', body: 'Renew → novi krajnji datum (po želji plata/protokol).' },
    ],
  },
  {
    id: 'hr-education',
    category: 'planika',
    title: 'HR — edukacije',
    route: '/planika/hr/education',
    overview: 'Programi, prijave, certifikati i planovi razvoja.',
    steps: [
      { title: 'Program', body: 'Kreirajte kurs/trening i tip (interna, online…).' },
      { title: 'Prijava', body: 'Prijavite zaposlenika. Na završetku može nastati certifikat.' },
      { title: 'Plan razvoja', body: 'Individualni ciljevi i aktivnosti zaposlenika.' },
    ],
  },
  {
    id: 'hr-talent',
    category: 'planika',
    title: 'HR — talent',
    route: '/planika/hr/talent',
    overview: 'Talent pool, 9-box, karijerne putanje i nasljeđivanje.',
    steps: [
      { title: 'Profil', body: 'Ocijenite performanse i potencijal zaposlenika.' },
      { title: '9-box', body: 'Pregledajte matricu raspodjele talenata.' },
      { title: 'Nasljeđivanje', body: 'Za ključnu poziciju imenujte nasljednika.' },
    ],
  },
];
