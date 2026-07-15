import { FileText, Calendar, Target, Award, TrendingUp, AlertCircle, CheckCircle2, BarChart3, Users, ShoppingBag, MessageSquare, BookOpen, Clock, ArrowUp, ArrowDown } from 'lucide-react';

interface EvaluationCriterion {
  name: string;
  maxPoints: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const evaluationCriteria: EvaluationCriterion[] = [
  { 
    name: 'Prodajni rezultati', 
    maxPoints: 30, 
    description: 'Ostvarenje personalnih mjesečnih i kvartalnih planova (parski i finansijski)',
    icon: Target 
  },
  { 
    name: 'Prodani rezultati', 
    maxPoints: 20, 
    description: 'Ostvarenje plana prodavnice',
    icon: ShoppingBag 
  },
  { 
    name: 'Indexi vezane prodaje', 
    maxPoints: 10, 
    description: 'indeksi vezane prodaje (UPT i PAR/KOM) – 5 bodova, učešće Planika Club kartica – 5 bodova',
    icon: BarChart3 
  },
  { 
    name: 'Kvalitet usluge prema kupcima', 
    maxPoints: 20, 
    description: 'Kvalitetna implementacija procedure 7 koraka u radu s kupcima, ljubaznost, tačnost u radu, profesionalni odnos prema kupcima (tajni kupac, ankete)',
    icon: MessageSquare 
  },
  { 
    name: 'Poznavanje proizvoda i njihovih karakteristika', 
    maxPoints: 10, 
    description: 'Dobro vlada svim relevantnim informacijama u vezi s proizvodima te ih zna kvalitetno prezentirati kupcima',
    icon: BookOpen 
  },
  { 
    name: 'Radna disciplina i timski rad', 
    maxPoints: 10, 
    description: 'Dolasci, rad na kasi, urednost radnog mesta, poštovanje i poznavanje poslovnih procedura potrebnih za rad u prodavnici, rad u lageru. Komunikacija sa kolegama, pomoć novim zaposlenima, inicijativa u rješavanju problema',
    icon: Users 
  },
];

interface CategoryInfo {
  category: 'A' | 'B' | 'C';
  title: string;
  level: string;
  description: string;
  salaryInfo: string;
  icon: React.ComponentType<{ className?: string }>;
  colorScheme: {
    bg: string;
    bgLight: string;
    border: string;
    text: string;
    icon: string;
  };
}

const categoryInfo: CategoryInfo[] = [
  {
    category: 'C',
    title: 'Prodavač – kategorija C',
    level: 'Početni nivo',
    description: 'Zaposlenik je u fazi učenja, pokazuje osnovno znanje i razumjevanje prodaje, te zahtjeva vođenje i mentorstvo.',
    salaryInfo: 'Osnovna plata',
    icon: AlertCircle,
    colorScheme: {
      bg: 'bg-red-500',
      bgLight: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-300 dark:border-red-700',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-600 dark:text-red-400',
    },
  },
  {
    category: 'B',
    title: 'Prodavač – kategorija B',
    level: 'Srednji nivo',
    description: 'Zaposlenik pokazuje stabilne prodajne rezultate, dobro poznaje asortiman i samostalno obavlja zadatke.',
    salaryInfo: 'Povećanje plate 10% u odnosu na kategoriju C',
    icon: TrendingUp,
    colorScheme: {
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-300 dark:border-amber-700',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-600 dark:text-amber-400',
    },
  },
  {
    category: 'A',
    title: 'Prodavač – kategorija A',
    level: 'Napredni nivo',
    description: 'Zaposlenik ostvaruje iznadprosječne prodajne rezultate u dužem vremenskom periodu, izražene komunikacijske i organizacione sposobnosti te je konzistentan u smislu kvalitetne usluge prema kupcima. Često služi kao primjer drugim zaposlenima.',
    salaryInfo: 'Povećanje plate 20% u odnosu na kategoriju C',
    icon: Award,
    colorScheme: {
      bg: 'bg-green-500',
      bgLight: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-700 dark:text-green-300',
      icon: 'text-green-600 dark:text-green-400',
    },
  },
];

const categoryDistribution = [
  { range: '90 – 100', category: 'Prodavač – kategorija A' },
  { range: '80 – 89', category: 'Prodavač – kategorija B' },
  { range: 'Ispod 80', category: 'Prodavač – kategorija C' },
];

export default function SalespersonEvaluationInfo() {
  const totalPoints = evaluationCriteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 sm:p-3 lg:p-6 mb-1.5 sm:mb-3 lg:mb-6">
      {/* Header */}
      <div className="mb-2 sm:mb-3 lg:mb-8">
        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-3 mb-1.5 sm:mb-2 lg:mb-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-1 sm:p-1.5 lg:p-3 rounded-lg flex-shrink-0">
            <FileText className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-[9px] sm:text-[10px] lg:text-2xl font-bold text-gray-900 dark:text-white break-words">
            Procjena učinka zaposlenih – prodajno osoblje
          </h2>
        </div>
        <p className="text-[7px] sm:text-[8px] lg:text-base text-gray-600 dark:text-gray-400 leading-tight mb-1 sm:mb-1.5 lg:mb-2">
          Prodajno osoblje se dijeli prema nivou učenja, znanja, prodajnih vještina, rezultata, komunikacijskih i organizacijskih sposobnosti u 3 Kategorije.
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-1.5 sm:p-2 lg:p-3 mt-1.5 sm:mt-2 lg:mt-3">
          <p className="text-[7px] sm:text-[8px] lg:text-sm text-gray-700 dark:text-gray-300 leading-tight">
            <span className="font-semibold">Napomena:</span> Svi novi zaposleni kreću od kategorije C.
          </p>
        </div>
      </div>

      {/* Categories Overview */}
      <div className="mb-2 sm:mb-3 lg:mb-8">
        <h3 className="text-[9px] sm:text-[10px] lg:text-lg font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 lg:mb-4 flex items-center gap-1 sm:gap-1.5">
          <Users className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          Kategorije prodajnog osoblja
        </h3>
        <div className="overflow-x-auto -mx-1.5 sm:-mx-2 lg:mx-0 px-1.5 sm:px-2 lg:px-0 mb-2 sm:mb-3 lg:mb-4">
          <table className="w-full border-collapse min-w-[250px] sm:min-w-[350px]">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white">
                  Kategorija
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white">
                  Opis
                </th>
              </tr>
            </thead>
            <tbody>
              {categoryInfo.map((cat) => {
                const Icon = cat.icon;
                return (
                  <tr
                    key={cat.category}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3">
                      <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-3">
                        <div className={`${cat.colorScheme.icon} p-0.5 sm:p-1 lg:p-2 rounded-lg ${cat.colorScheme.bgLight} flex-shrink-0`}>
                          <Icon className="w-2 h-2 sm:w-3 sm:h-3 lg:w-5 lg:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={`text-[7px] sm:text-[8px] lg:text-sm font-bold ${cat.colorScheme.text} break-words block`}>
                            {cat.title}
                          </span>
                          <p className="text-[6px] sm:text-[7px] lg:text-xs text-gray-600 dark:text-gray-400 mt-0.5 break-words">
                            {cat.level}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3">
                      <div className="space-y-1 sm:space-y-1.5 lg:space-y-2">
                        <p className="text-[7px] sm:text-[8px] lg:text-sm text-gray-900 dark:text-white break-words leading-tight">
                          {cat.description}
                        </p>
                        <p className="text-[6px] sm:text-[7px] lg:text-xs font-medium text-gray-700 dark:text-gray-300 break-words leading-tight">
                          {cat.salaryInfo}
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation Criteria */}
      <div className="mb-2 sm:mb-3 lg:mb-8">
        <h3 className="text-[9px] sm:text-[10px] lg:text-lg font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 lg:mb-4 flex items-center gap-1 sm:gap-1.5">
          <Target className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          3.1. Kriteriji ocjenjivanja
        </h3>
        <p className="text-[7px] sm:text-[8px] lg:text-base text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2 lg:mb-4 leading-tight">
          Prodajno osoblje se ocjenjuje svakih 6 mjeseci na osnovu sljedećih kriterija:
        </p>
        <div className="overflow-x-auto -mx-1.5 sm:-mx-2 lg:mx-0 px-1.5 sm:px-2 lg:px-0">
          <table className="w-full border-collapse min-w-[200px] sm:min-w-[300px]">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white">
                  Kriterij
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-0.5 sm:py-1 lg:py-3 text-center text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white w-12 sm:w-20 lg:w-32">
                  Maksimalan broj bodova
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white">
                  Opis
                </th>
              </tr>
            </thead>
            <tbody>
              {evaluationCriteria.map((criterion, index) => {
                const Icon = criterion.icon;
                return (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3">
                      <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-0.5 rounded flex-shrink-0">
                          <Icon className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-4 lg:h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-[7px] sm:text-[8px] lg:text-sm font-medium text-gray-900 dark:text-white break-words leading-tight">
                          {criterion.name}
                        </span>
                      </div>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3 text-center">
                      <span className="text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white">
                        {criterion.maxPoints}
                      </span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3">
                      <span className="text-[7px] sm:text-[8px] lg:text-sm text-gray-700 dark:text-gray-300 break-words leading-tight">
                        {criterion.description}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3 text-[7px] sm:text-[8px] lg:text-sm text-gray-900 dark:text-white">
                  UKUPNO
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3 text-center text-[7px] sm:text-[8px] lg:text-sm text-gray-900 dark:text-white">
                  {totalPoints}
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation Method */}
      <div className="mb-2 sm:mb-3 lg:mb-8">
        <h3 className="text-[9px] sm:text-[10px] lg:text-lg font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 lg:mb-4 flex items-center gap-1 sm:gap-1.5">
          <CheckCircle2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          3.2. Način ocjenjivanja
        </h3>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-1.5 sm:p-2 lg:p-4 space-y-1 sm:space-y-1.5 lg:space-y-2">
          <p className="text-[7px] sm:text-[8px] lg:text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1 sm:gap-1.5 lg:gap-2 leading-tight">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1 flex-shrink-0">•</span>
            <span className="break-words">Ocjenjivanje sprovodi regionalni menadžer zajedno sa HR sektorom.</span>
          </p>
          <p className="text-[7px] sm:text-[8px] lg:text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1 sm:gap-1.5 lg:gap-2 leading-tight">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1 flex-shrink-0">•</span>
            <span className="break-words">Ocjene se unose u standardizovani obrazac (prilog B).</span>
          </p>
          <p className="text-[7px] sm:text-[8px] lg:text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1 sm:gap-1.5 lg:gap-2 leading-tight">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1 flex-shrink-0">•</span>
            <span className="break-words">Svaki zaposleni dobija zbirnu ocjenu u rasponu od 0 do 100 bodova.</span>
          </p>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="mb-2 sm:mb-3 lg:mb-8">
        <h3 className="text-[9px] sm:text-[10px] lg:text-lg font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 lg:mb-4 flex items-center gap-1 sm:gap-1.5">
          <BarChart3 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          3.3. Raspodjela kategorija
        </h3>
        <p className="text-[7px] sm:text-[8px] lg:text-base text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2 lg:mb-4 leading-tight">
          Raspodjela kategorija se radi prema bodovnoj skali kao što je definirano u tabeli:
        </p>
        <div className="overflow-x-auto -mx-1.5 sm:-mx-2 lg:mx-0 px-1.5 sm:px-2 lg:px-0">
          <table className="w-full border-collapse min-w-[200px] sm:min-w-[250px]">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white">
                  Ukupan broj bodova
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white">
                  Kategorija
                </th>
              </tr>
            </thead>
            <tbody>
              {categoryDistribution.map((item, index) => {
                const category = categoryInfo.find(c => item.category.includes(c.category));
                const colorScheme = category?.colorScheme || categoryInfo[0].colorScheme;
                return (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3">
                      <span className="text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white">
                        {item.range}
                      </span>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3">
                      <span className={`text-[7px] sm:text-[8px] lg:text-sm font-medium ${colorScheme.text} break-words`}>
                        {item.category}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advancement and Development */}
      <div>
        <h3 className="text-[9px] sm:text-[10px] lg:text-lg font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 lg:mb-4 flex items-center gap-1 sm:gap-1.5">
          <ArrowUp className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          3.4. Napredovanje i razvoj
        </h3>
        <div className="space-y-2 sm:space-y-3 lg:space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-1.5 sm:p-2 lg:p-4">
            <h4 className="font-semibold text-[8px] sm:text-[9px] lg:text-base text-gray-900 dark:text-white mb-1.5 sm:mb-2 lg:mb-3 flex items-center gap-1 sm:gap-1.5">
              <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              Napredovanje
            </h4>
            <ul className="space-y-1 sm:space-y-1.5 lg:space-y-2 text-[7px] sm:text-[8px] lg:text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-1 sm:gap-1.5 lg:gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1 flex-shrink-0">•</span>
                <span className="break-words leading-tight">
                  <span className="font-semibold">Prelazak iz kategorije C u B:</span> Dva uzastopna kvartala sa rezultatom iznad 65 bodova i pozitivan izveštaj neposrednog rukovodioca.
                </span>
              </li>
              <li className="flex items-start gap-1 sm:gap-1.5 lg:gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-1 flex-shrink-0">•</span>
                <span className="break-words leading-tight">
                  <span className="font-semibold">Prelazak iz kategorije B u A:</span> Dva kvartala sa rezultatom iznad 85 bodova i dodatni kvaliteti kao vođenje tima ili mentorstvo.
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-1.5 sm:p-2 lg:p-4">
            <h4 className="font-semibold text-[8px] sm:text-[9px] lg:text-base text-gray-900 dark:text-white mb-1.5 sm:mb-2 lg:mb-3 flex items-center gap-1 sm:gap-1.5">
              <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              Promjena kategorije
            </h4>
            <ul className="space-y-1 sm:space-y-1.5 lg:space-y-2 text-[7px] sm:text-[8px] lg:text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-1 sm:gap-1.5 lg:gap-2">
                <span className="text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1 flex-shrink-0">•</span>
                <span className="break-words leading-tight">Promjene kategorije potvrđuje HR služba i nadređeni rukovodilac.</span>
              </li>
              <li className="flex items-start gap-1 sm:gap-1.5 lg:gap-2">
                <span className="text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1 flex-shrink-0">•</span>
                <span className="break-words leading-tight">
                  Promjena kategorije može biti i vice versa odnosno od veće kategorije (B ili A) ka manjoj (C ili B), 
                  a u slučaju da zaposleni ostvaruje rezultate ispod očekivanih i to u dva uzastopna kvartala.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

