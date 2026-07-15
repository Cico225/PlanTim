import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Uslovi Korištenja
          </h1>

          <div className="prose dark:prose-invert max-w-none">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Posljednje ažurirano: {new Date().toLocaleDateString('bs-BA')}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Prihvatanje Uslova
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Pristupanjem i korištenjem PlanTim platforme, prihvatate ove uslove korištenja u
                cjelosti. Ako se ne slažete sa ovim uslovima, molimo vas da ne koristite našu platformu.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Opis Usluge
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                PlanTim je enterprise kolaboracijski alat koji omogućava:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>Upravljanje projektima i zadacima</li>
                <li>CRM (Customer Relationship Management)</li>
                <li>Upravljanje dokumentima (DMS)</li>
                <li>E-learning sistem (LMS)</li>
                <li>Upravljanje ljudskim resursima (HRM)</li>
                <li>Internu komunikaciju i chat</li>
                <li>AI asistenta i alate</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Korisnički Nalog
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Za korištenje platforme potrebno je kreirati nalog. Vi ste odgovorni za:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>Održavanje sigurnosti vašeg naloga i lozinke</li>
                <li>Sve aktivnosti koje se dešavaju pod vašim nalogom</li>
                <li>Odmah nas obavijestiti o neovlaštenom pristupu</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                4. Privatnost i Zaštita Podataka
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Vaša privatnost je važna za nas. Prikupljanje, korištenje i zaštita vaših ličnih
                podataka regulisani su našom{' '}
                <Link to="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">
                  Politikom Privatnosti
                </Link>
                , koja je u skladu sa GDPR propisima.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                5. Prihvatljivo Korištenje
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Zabranjeno je koristiti platformu za:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-2">
                <li>Nezakonite aktivnosti ili kršenje zakona</li>
                <li>Narušavanje sigurnosti sistema</li>
                <li>Upload malicioznog softvera ili virusa</li>
                <li>Neovlašteno pristupanje tuđim podacima</li>
                <li>Spam ili zloupotrebu servisa</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                6. Intelektualna Svojina
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Sve intelektualne svojine na platformi (dizajn, kod, logo, sadržaj) su vlasništvo
                PlanTim-a. Vi zadržavate prava na sadržaj koji kreirate i upload-ujete.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                7. Odricanje Odgovornosti
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Platforma se pruža "kakva jeste". Ne garantujemo neprekidnu dostupnost ili potpunu
                sigurnost od gubitka podataka. Koristite platformu na vlastitu odgovornost.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                8. Izmjene Uslova
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Zadržavamo pravo da izmijenimo ove uslove u bilo kom trenutku. O značajnim
                izmjenama ćete biti obaviješteni putem email-a ili obavijesti na platformi.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                9. Raskid Ugovora
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Možete zatvoriti svoj nalog u bilo kojem trenutku. Mi možemo suspendovati ili
                zatvoriti vaš nalog u slučaju kršenja ovih uslova.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                10. Kontakt
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Za pitanja o ovim uslovima, kontaktirajte nas na:
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Email: <a href="mailto:support@plantim.com" className="text-primary-600 dark:text-primary-400 hover:underline">support@plantim.com</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}


