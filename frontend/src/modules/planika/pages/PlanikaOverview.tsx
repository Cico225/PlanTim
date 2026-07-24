import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PLANIKA_SUBMODULES } from '../constants';
import PlanikaSubmoduleAnimation from '../components/PlanikaSubmoduleAnimation';

export default function PlanikaOverview() {
  const { t } = useTranslation();
  const colorStyles: Record<string, { bg: string; icon: string; ring: string }> = {
    orange: {
      bg: 'bg-orange-500/10',
      icon: 'text-orange-600 dark:text-orange-400',
      ring: 'group-hover:ring-orange-200 dark:group-hover:ring-orange-900/50',
    },
    teal: {
      bg: 'bg-teal-500/10',
      icon: 'text-teal-600 dark:text-teal-400',
      ring: 'group-hover:ring-teal-200 dark:group-hover:ring-teal-900/50',
    },
    pink: {
      bg: 'bg-pink-500/10',
      icon: 'text-pink-600 dark:text-pink-400',
      ring: 'group-hover:ring-pink-200 dark:group-hover:ring-pink-900/50',
    },
    purple: {
      bg: 'bg-purple-500/10',
      icon: 'text-purple-600 dark:text-purple-400',
      ring: 'group-hover:ring-purple-200 dark:group-hover:ring-purple-900/50',
    },
    green: {
      bg: 'bg-green-500/10',
      icon: 'text-green-600 dark:text-green-400',
      ring: 'group-hover:ring-green-200 dark:group-hover:ring-green-900/50',
    },
    yellow: {
      bg: 'bg-yellow-500/10',
      icon: 'text-yellow-600 dark:text-yellow-400',
      ring: 'group-hover:ring-yellow-200 dark:group-hover:ring-yellow-900/50',
    },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('planika.title')}
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Specijalizovani modul za Planika operacije
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {PLANIKA_SUBMODULES.map((submodule, index) => {
          const styles = colorStyles[submodule.color] ?? colorStyles.orange;

          return (
            <motion.div
              key={submodule.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
            >
              <Link
                to={submodule.route}
                className={`group card flex h-full flex-col overflow-hidden border border-transparent p-0 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-2 ${styles.ring}`}
              >
                <PlanikaSubmoduleAnimation
                  submoduleId={submodule.id}
                  color={submodule.color}
                  className="mx-4 mt-4"
                />

                <div className="flex flex-1 flex-col p-5 pt-4">
                  <div className="mb-2 flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles.bg}`}
                    >
                      <submodule.icon className={styles.icon} size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t(submodule.nameKey)}
                      </h3>
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {submodule.id}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {t(submodule.descriptionKey)}
                  </p>
                  <p className="mt-4 text-xs font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-primary-400">
                    Otvori modul →
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="card p-6">
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          PLANIKA Modul — U razvoju
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Svi podmoduli će biti implementirani prema specifikacijama.
        </p>
      </div>
    </div>
  );
}
