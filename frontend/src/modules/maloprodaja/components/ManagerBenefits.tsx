import { Check } from 'lucide-react';
import { MANAGER_CATEGORY_BENEFITS, categoryIcon } from '../data/categoryBenefits';

export default function ManagerBenefits() {
  return (
    <div id="manager-benefits" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Benefiti menadžera prodavnica</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 sm:text-base">Pregled benefita po kategorijama menadžera prodavnica</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {MANAGER_CATEGORY_BENEFITS.map((category) => {
          const CategoryIcon = categoryIcon(category.category);
          return (
            <div
              key={category.category}
              className={`relative overflow-hidden rounded-xl border-2 ${category.colorScheme.border} ${category.colorScheme.bgLight} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
            >
              <div className={`bg-gradient-to-r ${category.colorScheme.gradient} p-4 text-white sm:p-6`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className={`${category.colorScheme.bg} shrink-0 rounded-lg bg-white/20 p-2 backdrop-blur-sm sm:p-3`}>
                    <CategoryIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className={`${category.colorScheme.bg} shrink-0 rounded-lg bg-white/20 px-3 py-1.5 text-2xl font-bold backdrop-blur-sm sm:px-4 sm:py-2 sm:text-3xl`}>
                    {category.category}
                  </span>
                </div>
                <h3 className="mb-1 text-base font-bold sm:text-lg">{category.title}</h3>
                <p className="text-xs text-white/90 sm:text-sm">{category.description}</p>
              </div>

              <div className="space-y-2 p-4 sm:space-y-3 sm:p-6">
                {category.benefits.map((benefit) => {
                  const Icon = benefit.icon || Check;
                  return (
                    <div
                      key={benefit.text}
                      className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-2.5 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600 sm:gap-3 sm:p-3"
                    >
                      <div className={`${category.colorScheme.icon} ${category.colorScheme.bgDark} mt-0.5 shrink-0 rounded-md p-1.5`}>
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <p className="flex-1 text-xs font-medium leading-relaxed text-gray-900 dark:text-white sm:text-sm">{benefit.text}</p>
                    </div>
                  );
                })}
              </div>

              <div className={`absolute right-0 top-0 h-24 w-24 ${category.colorScheme.bg} rounded-bl-full opacity-10`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
