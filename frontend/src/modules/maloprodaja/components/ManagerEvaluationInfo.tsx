import { FileText, Calendar, Target, Award, TrendingUp, AlertCircle, CheckCircle2, BarChart3, Users, Package, ClipboardCheck, Lightbulb } from 'lucide-react';

interface EvaluationCriterion {
  name: string;
  maxPoints: number;
  icon: React.ComponentType<{ className?: string }>;
}

const evaluationCriteria: EvaluationCriterion[] = [
  { name: 'Ostvarenje plana prodaje prodavnice', maxPoints: 45, icon: Target },
  { name: 'KPI indeksi vezane prodaje prodavnice i učinkovitost prodavnice (UPT, PAR/KOM i stopa realizacije)', maxPoints: 10, icon: BarChart3 },
  { name: 'Upravljanje zalihama (obrt) i smanjenje reklamacija', maxPoints: 10, icon: Package },
  { name: 'Implementacija 7 koraka na timskom nivou', maxPoints: 10, icon: ClipboardCheck },
  { name: 'Organizacija tima i fluktuacija kadrova', maxPoints: 10, icon: Users },
  { name: 'Sprovođenje operativnih procedura', maxPoints: 10, icon: FileText },
  { name: 'Inicijativa i doprinos radu firme', maxPoints: 5, icon: Lightbulb },
];

interface CategoryInfo {
  category: 'A' | 'B' | 'C';
  title: string;
  pointsRange: string;
  description: string;
  salaryIncrease: string;
  additionalInfo?: string;
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
    category: 'A',
    title: 'Izvanredni rezultati',
    pointsRange: '90 i više bodova',
    description: 'Menadžer ispunjava sve ciljeve, pokazuje proaktivnost, doprinosi timskom duhu.',
    salaryIncrease: '+20% u odnosu na kategoriju C',
    icon: Award,
    colorScheme: {
      bg: 'bg-green-500',
      bgLight: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-700 dark:text-green-300',
      icon: 'text-green-600 dark:text-green-400',
    },
  },
  {
    category: 'B',
    title: 'Zadovoljavajući rezultat',
    pointsRange: '80-89 bodova',
    description: 'Menadžer uglavnom ispunjava ciljeve, uz manja odstupanja.',
    salaryIncrease: '+10% u odnosu na kategoriju C',
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
    category: 'C',
    title: 'Potrebno poboljšanje',
    pointsRange: 'Ispod 80 bodova',
    description: 'Menadžer ne ispunjava ključne ciljeve ili pokazuje značajne slabosti u vođenju.',
    salaryIncrease: 'Bez povećanja plate',
    additionalInfo: 'Izrađuje se plan unapređenja rada od regionalnih menadžera.',
    icon: AlertCircle,
    colorScheme: {
      bg: 'bg-red-500',
      bgLight: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-300 dark:border-red-700',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-600 dark:text-red-400',
    },
  },
];

export default function ManagerEvaluationInfo() {
  const totalPoints = evaluationCriteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 sm:p-3 lg:p-6 mb-1.5 sm:mb-3 lg:mb-6">
      {/* Header - Mobile Responsive */}
      <div className="mb-2 sm:mb-3 lg:mb-8">
        <div className="flex items-start gap-1 sm:gap-1.5 lg:gap-3 mb-1.5 sm:mb-2 lg:mb-4">
          <div className="bg-teal-100 dark:bg-teal-900/30 p-1 sm:p-1.5 lg:p-3 rounded-lg flex-shrink-0 mt-0.5">
            <FileText className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-6 lg:h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[9px] sm:text-[10px] lg:text-xl font-bold text-gray-900 dark:text-white leading-tight break-words">
              Procjena učinka zaposlenih – menadžeri prodavnica
            </h2>
          </div>
        </div>
        <p className="text-[7px] sm:text-[8px] lg:text-sm text-gray-600 dark:text-gray-400 leading-tight">
          Ova procedura definiše proces evaluacije rada menadžera prodavnica u sektoru maloprodaje obuće, 
          sa ciljem kategorizacije prema učinku i dodjeljivanja odgovarajućih kategorija menadžera.
        </p>
      </div>

      {/* Categories Overview - Mobile Responsive */}
      <div className="mb-2 sm:mb-3 lg:mb-8">
        <h3 className="text-[9px] sm:text-[10px] lg:text-base font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 lg:mb-4 flex items-center gap-1 sm:gap-1.5">
          <Users className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-5 lg:h-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
          <span>2.1. Kategorije menadžera</span>
        </h3>
        <p className="text-[7px] sm:text-[8px] lg:text-sm text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2 lg:mb-4">
          Menadžeri se na osnovu evaluacije svrstavaju u jednu od tri kategorije:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          {categoryInfo.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.category}
                className={`p-2 sm:p-3 lg:p-4 rounded-lg border-2 ${cat.colorScheme.border} ${cat.colorScheme.bgLight} transition-all hover:shadow-md`}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 mb-1 sm:mb-1.5 lg:mb-2">
                  <div className={`${cat.colorScheme.icon} p-1 sm:p-1.5 lg:p-2 rounded-lg ${cat.colorScheme.bgLight} flex-shrink-0`}>
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`text-xs sm:text-sm lg:text-2xl font-bold ${cat.colorScheme.text} break-words block`}>
                      Kategorija {cat.category}
                    </span>
                    <p className="text-[8px] sm:text-[9px] lg:text-sm font-medium text-gray-700 dark:text-gray-300 break-words">
                      {cat.title}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Evaluation Period */}
      <div className="mb-2 sm:mb-3 lg:mb-8">
        <h3 className="text-[9px] sm:text-[10px] lg:text-base font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 lg:mb-4 flex items-center gap-1 sm:gap-1.5">
          <Calendar className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-5 lg:h-5 text-teal-600 dark:text-teal-400" />
          2.2. Period evaluacije
        </h3>
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-1.5 sm:p-2 lg:p-4">
          <p className="text-[7px] sm:text-[8px] lg:text-sm text-gray-700 dark:text-gray-300 leading-tight">
            Evaluacija se sprovodi <span className="font-semibold">dva puta godišnje</span>, nakon proteka <span className="font-semibold">6 mjeseci</span>.
          </p>
        </div>
      </div>

      {/* Evaluation Criteria */}
      <div className="mb-2 sm:mb-3 lg:mb-8">
        <h3 className="text-[9px] sm:text-[10px] lg:text-base font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 lg:mb-4 flex items-center gap-1 sm:gap-1.5">
          <Target className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-5 lg:h-5 text-teal-600 dark:text-teal-400" />
          2.3. Kriteriji evaluacije
        </h3>
        <p className="text-[7px] sm:text-[8px] lg:text-sm text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2 lg:mb-4 leading-tight">
          Evaluacija se zasniva na sljedećim ključnim pokazateljima uspješnosti (KPI):
        </p>
        <div className="overflow-x-auto -mx-2 sm:-mx-3 lg:mx-0 px-2 sm:px-3 lg:px-0">
          <table className="w-full border-collapse min-w-[200px] sm:min-w-[280px]">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white">
                  Kriterijum
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-0.5 sm:py-1 lg:py-3 text-center text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white w-12 sm:w-20 lg:w-32">
                  Maksimalan broj bodova
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
                        <div className="bg-teal-100 dark:bg-teal-900/30 p-0.5 rounded flex-shrink-0">
                          <Icon className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-4 lg:h-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <span className="text-[7px] sm:text-[8px] lg:text-sm text-gray-900 dark:text-white break-words leading-tight">
                          {criterion.name}
                        </span>
                      </div>
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3 text-center">
                      <span className="text-[7px] sm:text-[8px] lg:text-sm font-semibold text-gray-900 dark:text-white">
                        {criterion.maxPoints}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-teal-50 dark:bg-teal-900/20 font-semibold">
                <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3 text-[7px] sm:text-[8px] lg:text-sm text-gray-900 dark:text-white">
                  UKUPNO
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-0.5 sm:px-1 lg:px-4 py-1 sm:py-1.5 lg:py-3 text-center text-[7px] sm:text-[8px] lg:text-sm text-gray-900 dark:text-white">
                  {totalPoints}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation and Categorization */}
      <div>
        <h3 className="text-[9px] sm:text-[10px] lg:text-base font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2 lg:mb-4 flex items-center gap-1 sm:gap-1.5">
          <CheckCircle2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 lg:w-5 lg:h-5 text-teal-600 dark:text-teal-400" />
          2.4. Ocjenjivanje i kategorizacija
        </h3>
        <div className="space-y-2 sm:space-y-3 lg:space-y-4">
          {categoryInfo.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.category}
                className={`border-2 ${cat.colorScheme.border} ${cat.colorScheme.bgLight} rounded-lg p-2 sm:p-3 lg:p-5 transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-1.5 sm:gap-2 lg:gap-4">
                  <div className={`${cat.colorScheme.icon} p-1.5 sm:p-2 lg:p-3 rounded-lg ${cat.colorScheme.bgLight} flex-shrink-0`}>
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-6 lg:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 lg:gap-3 mb-1.5 sm:mb-2">
                      <span className={`text-[10px] sm:text-sm lg:text-xl font-bold ${cat.colorScheme.text} break-words`}>
                        Kategorija {cat.category}
                      </span>
                      <span className="text-[8px] sm:text-[9px] lg:text-sm font-medium text-gray-600 dark:text-gray-400 break-words">
                        – {cat.title}
                      </span>
                    </div>
                    <ul className="space-y-1 sm:space-y-1.5 lg:space-y-2 text-[7px] sm:text-[8px] lg:text-sm text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-1 sm:gap-1.5 lg:gap-2">
                        <span className="text-teal-600 dark:text-teal-400 mt-0.5 sm:mt-1 flex-shrink-0">•</span>
                        <span className="break-words leading-tight">
                          <span className="font-semibold">Ostvarenje:</span> {cat.pointsRange} od ukupnog rezultata po KPI sistemu.
                        </span>
                      </li>
                      <li className="flex items-start gap-1 sm:gap-1.5 lg:gap-2">
                        <span className="text-teal-600 dark:text-teal-400 mt-0.5 sm:mt-1 flex-shrink-0">•</span>
                        <span className="break-words leading-tight">
                          <span className="font-semibold">Opis:</span> {cat.description}
                        </span>
                      </li>
                      <li className="flex items-start gap-1 sm:gap-1.5 lg:gap-2">
                        <span className="text-teal-600 dark:text-teal-400 mt-0.5 sm:mt-1 flex-shrink-0">•</span>
                        <span className="break-words leading-tight">
                          <span className="font-semibold">Povećanje plate:</span> {cat.salaryIncrease}
                        </span>
                      </li>
                      {cat.additionalInfo && (
                        <li className="flex items-start gap-1 sm:gap-1.5 lg:gap-2">
                          <span className="text-teal-600 dark:text-teal-400 mt-0.5 sm:mt-1 flex-shrink-0">•</span>
                          <span className="break-words leading-tight">{cat.additionalInfo}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

