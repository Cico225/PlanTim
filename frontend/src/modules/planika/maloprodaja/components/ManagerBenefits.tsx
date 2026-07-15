import { FiCheck, FiAlertCircle, FiTrendingUp, FiAward, FiGift, FiBookOpen, FiUsers, FiCalendar } from 'react-icons/fi';

interface Benefit {
  text: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface CategoryBenefits {
  category: 'A' | 'B' | 'C';
  title: string;
  description: string;
  benefits: Benefit[];
  colorScheme: {
    bg: string;
    bgLight: string;
    bgDark: string;
    border: string;
    text: string;
    icon: string;
    gradient: string;
  };
}

const benefitsData: CategoryBenefits[] = [
  {
    category: 'C',
    title: 'Menadžeri prodavnica kategorija C',
    description: 'koji ne ispunjavaju očekivanja',
    colorScheme: {
      bg: 'bg-red-500',
      bgLight: 'bg-red-50 dark:bg-red-900/20',
      bgDark: 'bg-red-100 dark:bg-red-900/30',
      border: 'border-red-300 dark:border-red-700',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-600 dark:text-red-400',
      gradient: 'from-red-500 to-red-600',
    },
    benefits: [
      { text: 'Osnovna plaća', icon: FiUsers },
      { text: 'Uposlenički popust (3 para po sezoni)', icon: FiGift },
      { text: 'Petodnevna radna sedmica kvartalno', icon: FiCalendar },
      { text: 'Plan poboljšanja učinka', icon: FiTrendingUp },
      { text: 'Pristup edukacijama i treninzima', icon: FiBookOpen },
    ],
  },
  {
    category: 'B',
    title: 'Menadžeri prodavnica kategorija B',
    description: 'ostvaruju stabilne rezultate',
    colorScheme: {
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-50 dark:bg-amber-900/20',
      bgDark: 'bg-amber-100 dark:bg-amber-900/30',
      border: 'border-amber-300 dark:border-amber-700',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-600 dark:text-amber-400',
      gradient: 'from-amber-500 to-amber-600',
    },
    benefits: [
      { text: '+10% osnovna plaća', icon: FiTrendingUp },
      { text: 'Uposlenički popust (3 para po sezoni)', icon: FiGift },
      { text: 'Petodnevna radna sedmica kvartalno', icon: FiCalendar },
      { text: 'Plan poboljšanja učinka', icon: FiTrendingUp },
      { text: 'Pristup edukacijama i treninzima', icon: FiBookOpen },
      { text: 'Kolekcije i ankete', icon: FiAward },
    ],
  },
  {
    category: 'A',
    title: 'Menadžeri prodavnica kategorija A',
    description: 'dosljedno postižu visoke rezultate',
    colorScheme: {
      bg: 'bg-green-500',
      bgLight: 'bg-green-50 dark:bg-green-900/20',
      bgDark: 'bg-green-100 dark:bg-green-900/30',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-700 dark:text-green-300',
      icon: 'text-green-600 dark:text-green-400',
      gradient: 'from-green-500 to-green-600',
    },
    benefits: [
      { text: '+20% osnovna plaća', icon: FiTrendingUp },
      { text: 'Uposlenički popust (4 para po sezoni)', icon: FiGift },
      { text: 'Petodnevna radna sedmica mjesečno', icon: FiCalendar },
      { text: 'Poklon vaucher', icon: FiGift },
      { text: 'Mogućnost učešća u edukacijama kao mentor', icon: FiUsers },
    ],
  },
];

export default function ManagerBenefits() {
  return (
    <div id="manager-benefits" className="card p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Benefiti menadžera prodavnica
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Pregled benefita po kategorijama menadžera prodavnica
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {benefitsData.map((category) => {
          const CategoryIcon = category.category === 'A' ? FiAward : category.category === 'B' ? FiTrendingUp : FiAlertCircle;
          
          return (
            <div
              key={category.category}
              className={`relative overflow-hidden rounded-xl border-2 ${category.colorScheme.border} ${category.colorScheme.bgLight} transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}
            >
              {/* Header with gradient - Mobile Responsive */}
              <div className={`bg-gradient-to-r ${category.colorScheme.gradient} p-4 sm:p-6 text-white`}>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className={`${category.colorScheme.bg} p-2 sm:p-3 rounded-lg bg-white/20 backdrop-blur-sm flex-shrink-0`}>
                    <CategoryIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <span className={`text-2xl sm:text-3xl font-bold ${category.colorScheme.bg} bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex-shrink-0`}>
                    {category.category}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold mb-1">{category.title}</h3>
                <p className="text-xs sm:text-sm text-white/90">{category.description}</p>
              </div>

              {/* Benefits List - Mobile Responsive */}
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="space-y-2 sm:space-y-3">
                  {category.benefits.map((benefit, index) => {
                    const Icon = benefit.icon || FiCheck;
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-white dark:bg-dark-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        <div className={`${category.colorScheme.icon} p-1.5 rounded-md ${category.colorScheme.bgDark} flex-shrink-0 mt-0.5`}>
                          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white flex-1 leading-relaxed">
                          {benefit.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Decorative corner element */}
              <div className={`absolute top-0 right-0 w-24 h-24 ${category.colorScheme.bg} opacity-10 rounded-bl-full`}></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

