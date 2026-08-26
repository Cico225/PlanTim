/**
 * Snima ekrane PlanTim aplikacije i generiše PDF uputstvo za testiranje.
 *
 * Pokreni aplikaciju (https://localhost:5173), zatim:
 *   cd docs/test-uputstvo
 *   npm install
 *   node capture-and-make-pdf.mjs
 *
 * Opcionalno:
 *   set PLAN TIM_BASE=https://localhost:5173
 *   set PLANTIM_EMAIL=admin@plantim.com
 *   set PLANTIM_PASSWORD=password
 */

import { chromium } from 'playwright';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(__dirname, 'screenshots');
const OUT = path.join(__dirname, 'PlanTim-uputstvo-za-testiranje.pdf');

const BASE = (process.env.PLANTIM_BASE || 'https://localhost:5173').replace(/\/$/, '');
const EMAIL = process.env.PLANTIM_EMAIL || 'admin@plantim.com';
const PASSWORD = process.env.PLANTIM_PASSWORD || 'password';

fs.mkdirSync(SHOTS, { recursive: true });

const shots = [
  { name: '01-login', path: '/login', beforeLogin: true, title: 'Prijava' },
  { name: '02-dashboard', path: '/dashboard', title: 'Dashboard' },
  { name: '03-admin', path: '/admin', title: 'Admin hub' },
  { name: '04-users', path: '/admin/users', title: 'Korisnici', fallback: '/admin' },
  { name: '05-lms', path: '/lms', title: 'LMS' },
  { name: '06-lms-maloprodaja', path: '/lms/maloprodaja', title: 'LMS Maloprodaja' },
  { name: '07-planika', path: '/planika', title: 'Planika' },
  { name: '08-planika-hr', path: '/planika/hr', title: 'Planika HR' },
  { name: '09-ugovori', path: '/planika/hr/contracts', title: 'HR Ugovori' },
  { name: '10-finance', path: '/planika/finance', title: 'Planika Finansije' },
];

async function safeGoto(page, urlPath) {
  const url = `${BASE}${urlPath}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1200);
    return true;
  } catch (e) {
    console.warn(`  ! Ne mogu otvoriti ${url}: ${e.message}`);
    return false;
  }
}

async function login(page) {
  await safeGoto(page, '/login');
  // Prihvati eventualni cert warning nije potreban — ignoreHTTPSErrors
  const email = page.locator('input[type="email"], input[name="email"]').first();
  const password = page.locator('input[type="password"], input[name="password"]').first();
  await email.waitFor({ timeout: 20000 });
  await email.fill(EMAIL);
  await password.fill(PASSWORD);
  const submit = page.locator('button[type="submit"]').first();
  await submit.click();
  await page.waitForFunction(() => !!localStorage.getItem('token'), { timeout: 45000 }).catch(() => null);
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 45000 }).catch(() => null);
  await page.waitForTimeout(2000);
  // Terms modal ako postoji
  const accept = page.getByRole('button', { name: /prihvat|accept|slažem|continue|nastavi/i }).first();
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
    await page.waitForTimeout(800);
  }
}

async function capture() {
  console.log(`Snimanje sa ${BASE} ...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Login screen
  await safeGoto(page, '/login');
  await page.screenshot({ path: path.join(SHOTS, '01-login.png'), fullPage: false });
  console.log('  ✓ 01-login');

  await login(page);
  await page.screenshot({ path: path.join(SHOTS, '02-dashboard.png'), fullPage: false });
  console.log('  ✓ 02-dashboard');

  for (const shot of shots.slice(2)) {
    const ok = await safeGoto(page, shot.path);
    if (!ok && shot.fallback) await safeGoto(page, shot.fallback);
    // Pokušaj klik na korisnike ako smo na admin hubu
    if (shot.name === '04-users') {
      const usersLink = page.getByText(/upravljanje korisnicima|korisnici/i).first();
      if (await usersLink.isVisible().catch(() => false)) {
        await usersLink.click();
        await page.waitForTimeout(1500);
      }
    }
    await page.screenshot({ path: path.join(SHOTS, `${shot.name}.png`), fullPage: false });
    console.log(`  ✓ ${shot.name}`);
  }

  // Role / modules ako postoje u navigaciji
  for (const extra of [
    { name: '11-moduli', texts: [/moduli i plugini|moduli/i] },
    { name: '12-uloge', texts: [/uloge i dozvole|uloge/i] },
  ]) {
    await safeGoto(page, '/admin');
    for (const t of extra.texts) {
      const el = page.getByText(t).first();
      if (await el.isVisible().catch(() => false)) {
        await el.click();
        await page.waitForTimeout(1500);
        break;
      }
    }
    await page.screenshot({ path: path.join(SHOTS, `${extra.name}.png`), fullPage: false });
    console.log(`  ✓ ${extra.name}`);
  }

  await browser.close();
}



function toWinAnsi(text) {
  const repl = {
    '\u0111': 'd', '\u0110': 'D',
    '\u010d': 'c', '\u010c': 'C',
    '\u0107': 'c', '\u0106': 'C',
    '\u0161': 's', '\u0160': 'S',
    '\u017e': 'z', '\u017d': 'Z',
    '\u2013': '-', '\u2014': '-',
    '\u201c': '"', '\u201d': '"', '\u201e': '"',
    '\u2019': "'", '\u2018': "'",
    '\u2022': '*', '\u2026': '...',
  };
  let out = '';
  for (const ch of text) {
    if (Object.prototype.hasOwnProperty.call(repl, ch)) out += repl[ch];
    else if (ch.charCodeAt(0) <= 255) out += ch;
    else out += '?';
  }
  return out;
}

function wrapText(text, font, size, maxWidth) {
  text = toWinAnsi(text);
  text = toWinAnsi(text);
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function makePdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pagesContent = [
    {
      heading: 'PlanTim — kratko uputstvo za testiranje',
      body: [
        'Pozdrav kolege,',
        '',
        'Ovo je kratko uputstvo kako od nule da se prijavite, kreirate korisnike, dodijelite uloge/ovlaštenja i prođete kroz module koje smo do sada uradili (LMS, Planika HR, finansije i ostalo).',
        '',
        'Aplikacija: https://localhost:5173',
        'Za pun pristup koristite admin nalog (npr. admin@plantim.com / password) dok ne napravimo posebne test naloge.',
        '',
        'Cilj testiranja: da potvrdite da se meni i ekrani otvaraju prema ovlaštenjima, da se korisnici mogu kreirati i da LMS/Planika rade bez blokada.',
      ],
      image: null,
    },
    {
      heading: '1. Prijava',
      body: [
        'Otvorite https://localhost:5173/login.',
        'Unesite email i lozinku, pa kliknite Prijavi se.',
        '',
        'Test nalozi (seed):',
        '• superadmin@plantim.com / password',
        '• admin@plantim.com / password',
        '• manager@plantim.com / password',
        '• employee@plantim.com / password',
        '',
        'Napomena: employee vidi manje stavki u meniju — to je očekivano. Za podešavanje pristupa ulogujte se kao admin.',
      ],
      image: '01-login.png',
    },
    {
      heading: '2. Šta vidite nakon prijave',
      body: [
        'Lijevi meni pokazuje samo module za koje korisnik ima pristup.',
        'Gore desno su inbox, notifikacije i uputstvo (ikona knjige).',
        '',
        'Prvo provjerite da se Dashboard otvara i da se sidebar ponaša normalno (skupljanje/raširivanje).',
      ],
      image: '02-dashboard.png',
    },
    {
      heading: '3. Unos korisnika',
      body: [
        'Idite na Admin → Upravljanje korisnicima.',
        'Kliknite Novi korisnik i popunite: ime, email, lozinku (min. 8 karaktera), ulogu i da li je aktivan.',
        'Sačuvajte i provjerite da se korisnik pojavi u listi (pretraga/filteri).',
        '',
        'Ovo je osnovni korak prije testiranja ovlaštenja — bez korisnika nema smisla testirati module.',
      ],
      image: '04-users.png',
    },
    {
      heading: '4. Dodjela uloga i ovlaštenja',
      body: [
        'Imamo dva nivoa (oba treba pogledati):',
        '',
        'A) Uloga (role): npr. admin, manager, employee, sef-prodavnice, prodavac…',
        '   Na korisniku → Dodjeli ulogu. Tu se vidi i pregled dozvola uloge.',
        '',
        'B) Pristup modulima (ono što stvarno izlazi u meniju):',
        '   Admin → Moduli i plugini → dozvole po korisniku ili ulozi.',
        '   Uključi npr. lms, lms.maloprodaja, planika, planika.hr, planika.hr.contracts, planika.finance…',
        '',
        'Provjera: odjavi se, prijavi se kao taj korisnik i potvrdi da u meniju vidi samo ono što ste mu dali.',
      ],
      image: '11-moduli.png',
    },
    {
      heading: '5. LMS — šta testirati',
      body: [
        'Otvorite /lms — hub „Sistem za učenje”.',
        'Maloprodaja: katalog, moji kursevi, putanja učenja, bedževi/certifikati (zavisno od sadržaja).',
        'Direkcija: trenutno u pripremi — dovoljno je da se panel otvara bez greške.',
        '',
        'Ako korisnik ima manage ovlaštenja, provjerite i upravljanje kursevima/lekcijama/kvizovima.',
        'Bitno: korisnik bez LMS ovlaštenja ne smije vidjeti LMS u meniju.',
      ],
      image: '05-lms.png',
    },
    {
      heading: '6. Planika moduli',
      body: [
        'Otvorite /planika — kartice podmodula (HR, finansije, maloprodaja…).',
        '',
        'HR (/planika/hr): pregled panela, zaposleni, ugovori.',
        'Ugovori (/planika/hr/contracts): lista, šabloni, novi ugovor, generisanje/preuzimanje, produženje, masovna izmjena (checkbox → Promijeni sve odjednom, npr. tip na 3 mjeseca).',
        '',
        'Finansije (/planika/finance): krediti i spiskovi ugovora.',
        'Maloprodaja: operativni dio i reklamacije (gdje je dostupno).',
        '',
        'Provjerite i da stari /hrm/* redirect ide na /planika/hr.',
      ],
      image: '07-planika.png',
    },
    {
      heading: '7. Predloženi redoslijed testa (15–20 min)',
      body: [
        '1) Login kao admin',
        '2) Kreiraj test korisnika + dodijeli ulogu',
        '3) U Modulima daj mu LMS Maloprodaja + Planika HR Ugovori',
        '4) Prođi /lms i /planika/hr/contracts kao admin',
        '5) Odjavi se → prijavi se kao test korisnik → potvrdi meni',
        '6) Pokušaj otvoriti modul koji mu NIJE dat (treba biti sakriven ili zabranjen)',
        '',
        'Ako nešto “puca” ili meni ne odgovara ovlaštenjima — pošaljite mi screenshot + koji nalog i URL.',
        '',
        'Hvala na testiranju.',
      ],
      image: '09-ugovori.png',
    },
  ];

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const maxText = pageWidth - margin * 2;

  for (const section of pagesContent) {
    const page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    page.drawText(toWinAnsi(section.heading), {
      x: margin,
      y: y - 18,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });
    y -= 40;

    for (const paragraph of section.body) {
      if (!paragraph) {
        y -= 10;
        continue;
      }
      const lines = wrapText(paragraph, font, 11, maxText);
      for (const line of lines) {
        if (y < 220 && section.image) break;
        if (y < 60) break;
        page.drawText(line, {
          x: margin,
          y,
          size: 11,
          font,
          color: rgb(0.15, 0.15, 0.18),
        });
        y -= 15;
      }
      y -= 4;
    }

    const imgPath = section.image ? path.join(SHOTS, section.image) : null;
    if (imgPath && fs.existsSync(imgPath)) {
      const bytes = fs.readFileSync(imgPath);
      const png = await pdf.embedPng(bytes);
      const maxW = maxText;
      const maxH = Math.min(320, y - margin - 20);
      const scale = Math.min(maxW / png.width, maxH / png.height);
      const w = png.width * scale;
      const h = png.height * scale;
      page.drawImage(png, {
        x: margin,
        y: margin,
        width: w,
        height: h,
      });
      page.drawText(toWinAnsi('Screenshot iz aplikacije'), {
        x: margin,
        y: margin + h + 8,
        size: 9,
        font,
        color: rgb(0.4, 0.45, 0.5),
      });
    } else if (section.image) {
      page.drawText(toWinAnsi('(Screenshot nije snimljen - pokrenite capture skriptu dok app radi.)'), {
        x: margin,
        y: Math.max(margin, y - 20),
        size: 10,
        font,
        color: rgb(0.6, 0.2, 0.2),
      });
    }
  }

  const pdfBytes = await pdf.save();
  fs.writeFileSync(OUT, pdfBytes);
  console.log(`\nPDF spreman: ${OUT}`);
}

const onlyPdf = process.argv.includes('--pdf-only');
try {
  if (!onlyPdf) await capture();
  await makePdf();
} catch (e) {
  console.error(e);
  process.exit(1);
}
