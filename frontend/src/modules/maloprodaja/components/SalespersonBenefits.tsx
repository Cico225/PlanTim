import { Check } from 'lucide-react';
import { SELLER_CATEGORY_BENEFITS, categoryIcon } from '../data/categoryBenefits';

export default function SalespersonBenefits() {
  return (
    <div id="salesperson-benefits" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Benefiti prodajnog osoblja</h2>
        <p className="text-gray-600 dark:text-gray-400">Pregled benefita po kategorijama prodavača</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {SELLER_CATEGORY_BENEFITS.map((category) => {
          const CategoryIcon = categoryIcon(category.category);
          return (
            <div
              key={category.category}
              className={`relative overflow-hidden rounded-xl border-2 ${category.colorScheme.border} ${category.colorScheme.bgLight} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
            >
              <div className={`bg-gradient-to-r ${category.colorScheme.gradient} p-6 text-white`}>
                <div className="mb-2 flex items-center justify-between">
                  <div className={`${category.colorScheme.bg} rounded-lg bg-white/20 p-3 backdrop-blur-sm`}>
                    <CategoryIcon className="h-6 w-6" />
                  </div>
                  <span className={`${category.colorScheme.bg} rounded-lg bg-white/20 px-4 py-2 text-3xl font-bold backdrop-blur-sm`}>
                    {category.category}
                  </span>
                </div>
                <h3 className="mb-1 text-lg font-bold">{category.title}</h3>
                <p className="text-sm text-white/90">{category.description}</p>
              </div>

              <div className="space-y-3 p-6">
                {category.benefits.map((benefit) => {
                  const Icon = benefit.icon || Check;
                  return (
                    <div
                      key={benefit.text}
                      className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-gray-600"
                    >
                      <div className={`${category.colorScheme.icon} ${category.colorScheme.bgDark} mt-0.5 shrink-0 rounded-md p-1.5`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{benefit.text}</p>
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
