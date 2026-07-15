import { Check, AlertCircle, TrendingUp, Award, Gift, BookOpen, Users, Calendar, UserCheck, Briefcase } from 'lucide-react';

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
    title: 'Prodavač kategorija C',
    description: 'Prodavač čiji učinak ne zadovoljava standard',
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
      { text: 'Osnovna plaća', icon: Users },
      { text: 'Osnovni uposlenički popust', icon: Gift },
      { text: 'Dodatni treninzi', icon: BookOpen },
      { text: 'Plan poboljšanja učinka', icon: TrendingUp },
      { text: 'Osnovni raspored smjena', icon: Calendar },
    ],
  },
  {
    category: 'B',
    title: 'Prodavač kategorija B',
    description: 'Prodavači koji stabilno ispunjavaju očekivanja',
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
      { text: '+10% osnovna plaća', icon: TrendingUp },
      { text: 'Osnovni uposlenički popust', icon: Gift },
      { text: 'Mogućnost učešća u radionicama i kolekcijama', icon: Award },
      { text: 'Mogućnost unapređenja u poslovođu', icon: Briefcase },
    ],
  },
  {
    category: 'A',
    title: 'Prodavač kategorija A',
    description: 'Prodavači koji kontinuirano ostvaruju vrhunske rezultate',
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
      { text: '+20% osnovna plaća', icon: TrendingUp },
      { text: 'Uposlenički popust (3 para po sezoni)', icon: Gift },
      { text: 'Petodnevna radna sedmica kvartalno', icon: Calendar },
      { text: 'Mogućnost unapređenja u poslovođu', icon: Briefcase },
    ],
  },
];

export default function SalespersonBenefits() {
  return (
    <div id="salesperson-benefits" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Benefiti prodajnog osoblja
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Pregled benefita po kategorijama prodavača
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {benefitsData.map((category) => {
          const CategoryIcon = category.category === 'A' ? Award : category.category === 'B' ? TrendingUp : AlertCircle;
          
          return (
            <div
              key={category.category}
              className={`relative overflow-hidden rounded-xl border-2 ${category.colorScheme.border} ${category.colorScheme.bgLight} transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}
            >
              {/* Header with gradient */}
              <div className={`bg-gradient-to-r ${category.colorScheme.gradient} p-6 text-white`}>
                <div className="flex items-center justify-between mb-2">
                  <div className={`${category.colorScheme.bg} p-3 rounded-lg bg-white/20 backdrop-blur-sm`}>
                    <CategoryIcon className="w-6 h-6" />
                  </div>
                  <span className={`text-3xl font-bold ${category.colorScheme.bg} bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg`}>
                    {category.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-1">{category.title}</h3>
                <p className="text-sm text-white/90">{category.description}</p>
              </div>

              {/* Benefits List */}
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  {category.benefits.map((benefit, index) => {
                    const Icon = benefit.icon || Check;
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        <div className={`${category.colorScheme.icon} p-1.5 rounded-md ${category.colorScheme.bgDark} flex-shrink-0 mt-0.5`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white flex-1">
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





