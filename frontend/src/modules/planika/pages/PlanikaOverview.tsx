import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PLANIKA_SUBMODULES } from '../constants';

export default function PlanikaOverview() {
  const { t } = useTranslation();
  const colorStyles: Record<
    string,
    { bg: string; icon: string }
  > = {
    orange: { bg: 'bg-orange-500/10', icon: 'text-orange-600 dark:text-orange-400' },
    teal: { bg: 'bg-teal-500/10', icon: 'text-teal-600 dark:text-teal-400' },
    pink: { bg: 'bg-pink-500/10', icon: 'text-pink-600 dark:text-pink-400' },
    purple: { bg: 'bg-purple-500/10', icon: 'text-purple-600 dark:text-purple-400' },
    green: { bg: 'bg-green-500/10', icon: 'text-green-600 dark:text-green-400' },
    yellow: { bg: 'bg-yellow-500/10', icon: 'text-yellow-600 dark:text-yellow-400' },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('planika.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Specijalizovani modul za Planika operacije
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {PLANIKA_SUBMODULES.map((submodule) => (
          <Link
            key={submodule.id}
            to={submodule.route}
            className="card p-6 hover:shadow-lg transition-shadow border border-transparent hover:border-primary-100 dark:hover:border-primary-900/30"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  colorStyles[submodule.color]?.bg ?? colorStyles.orange.bg
                }`}
              >
                <submodule.icon
                  className={colorStyles[submodule.color]?.icon ?? colorStyles.orange.icon}
                  size={20}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t(submodule.nameKey)}
                </h3>
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {submodule.id.toUpperCase()}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t(submodule.descriptionKey)}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {submodule.highlights.map((highlight) => (
                <div key={highlight.label}>
                  <p className="text-xs uppercase tracking-wide">{highlight.label}</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">{highlight.value}</p>
                </div>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          PLANIKA Modul - U razvoju
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Svi podmoduli će biti implementirani prema specifikacijama.
        </p>
      </div>
    </div>
  );
}


