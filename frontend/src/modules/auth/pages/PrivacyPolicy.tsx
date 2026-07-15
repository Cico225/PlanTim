import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShield, FiLock, FiEye, FiUserCheck } from 'react-icons/fi';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/login"
          className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline mb-8"
        >
          <FiArrowLeft className="mr-2" />
          Nazad na prijavu
        </Link>

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
          <div className="flex items-center mb-6">
            <FiShield className="text-4xl text-primary-600 dark:text-primary-400 mr-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Politika Privatnosti
            </h1>
          </div>

          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 mb-8">
            <p className="text-sm text-primary-800 dark:text-primary-300">
              <strong>GDPR Compliant:</strong> Ova politika je u skladu sa EU General Data Protection Regulation (GDPR)
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Posljednje ažurirano: {new Date().toLocaleDateString('bs-BA')}
            </p>

            <section className="mb-8">
              <div className="flex items-center mb-4">
                <FiUserCheck className="text-2xl text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  1. Podaci Koje Prikupljamo
                </h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Prikupljamo sljedeće kategorije podataka:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li><strong>Identifikacijski podaci:</strong> Ime, prezime, email adresa</li>
                <li><strong>Kontakt podaci:</strong> Telefon, adresa (opcionalno)</li>
                <li><strong>Podaci o nalogu:</strong> Username, lozinka (enkriptovana), postavke</li>
                <li><strong>Podaci o korištenju:</strong> Log-ovi pristupa, IP adrese, aktivnosti</li>
                <li><strong>Sadržaj:</strong> Projekti, zadaci, dokumenti, poruke koje kreirate</li>
              </ul>
            </section>

            <section className="mb-8">
              <div className="flex items-center mb-4">
                <FiLock className="text-2xl text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  2. Kako Koristimo Vaše Podatke
                </h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Vaši podaci se koriste za:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>Pružanje i održavanje usluge</li>
                <li>Autentifikaciju i kontrolu pristupa</li>
                <li>Personalizaciju korisničkog iskustva</li>
                <li>Komunikaciju sa vama (obavijesti, podrška)</li>
                <li>Poboljšanje platforme i razvoj novih funkcija</li>
                <li>Ispunjavanje zakonskih obaveza</li>
              </ul>
            </section>

            <section className="mb-8">
              <div className="flex items-center mb-4">
                <FiEye className="text-2xl text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  3. Vaša GDPR Prava
                </h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Pod GDPR-om imate sljedeća prava:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ✓ Pravo na pristup
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Možete zatražiti kopiju svih podataka koje čuvamo o vama
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ✓ Pravo na ispravku
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Možete ažurirati ili ispraviti netačne podatke
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ✓ Pravo na brisanje ("pravo na zaborav")
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Možete zatražiti brisanje vaših podataka
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ✓ Pravo na prenosivost podataka
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Možete dobiti vaše podatke u mašinski čitljivom formatu
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ✓ Pravo na ograničenje obrade
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Možete ograničiti kako koristimo vaše podatke
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ✓ Pravo na prigovor
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Možete prigovoriti obradi podataka u određenim okolnostima
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Koliko Čuvamo Podatke
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Čuvamo podatke:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li><strong>Aktivni nalozi:</strong> Dok god je vaš nalog aktivan</li>
                <li><strong>Neaktivni nalozi:</strong> 12 mjeseci nakon posljednje aktivnosti</li>
                <li><strong>Log-ovi:</strong> 90 dana (sigurnosni razlozi)</li>
                <li><strong>Zakonske obaveze:</strong> Kako zakon zahtijeva (računovodstvo, itd.)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Sigurnost Podataka
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Implementirali smo sljedeće sigurnosne mjere:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>SSL/TLS enkripcija za prenos podataka</li>
                <li>Bcrypt hash za lozinke</li>
                <li>Role-Based Access Control (RBAC)</li>
                <li>Redovni sigurnosni backup-i</li>
                <li>Monitoring i audit log-ovi</li>
                <li>Firewall zaštita</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Dijeljenje Podataka
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                NE prodajemo vaše podatke trećim stranama. Dijelimo podatke samo:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>Sa članovima vašeg tima (u okviru platforme)</li>
                <li>Sa servisnim provajderima (hosting, email)</li>
                <li>Kada zakon zahtijeva (sudski nalog)</li>
                <li>Sa vašim pristankom</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Kolačići (Cookies)
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Koristimo kolačiće za:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li><strong>Esencijalni:</strong> Za autentifikaciju i funkcionalnost</li>
                <li><strong>Postavke:</strong> Za čuvanje vaših preferencija (tema, jezik)</li>
                <li><strong>Analitika:</strong> Za praćenje korištenja i poboljšanje platforme</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Djeca
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Naša usluga nije namijenjena djeci mlađoj od 16 godina. Ne prikupljamo svjesno
                podatke od djece. Ako saznamo da smo prikupili podatke djeteta, odmah ćemo ih obrisati.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Izmjene Politike
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                O značajnim izmjenama ove politike ćete biti obaviješteni putem email-a najmanje
                30 dana prije stupanja na snagu.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Kontakt - Data Protection Officer
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Za pitanja o zaštiti podataka ili za ostvarivanje vaših GDPR prava:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:privacy@plantim.com" className="text-primary-600 dark:text-primary-400 hover:underline">
                    privacy@plantim.com
                  </a>
                </p>
                <p className="text-gray-700 dark:text-gray-300 mt-2">
                  <strong>GDPR Zahtjevi:</strong> Odgovaramo u roku od 30 dana
                </p>
              </div>
            </section>

            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-6 mt-8">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                🇪🇺 EU Supervisory Authority
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Imate pravo uložiti žalbu nadzornom tijelu za zaštitu podataka u vašoj zemlji ako
                smatrate da se vaša prava krše.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

