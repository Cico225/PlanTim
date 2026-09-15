import { useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PLANIKA_SUBMODULES } from '../constants';
import PlanikaSubmoduleAnimation from '../components/PlanikaSubmoduleAnimation';
import MaloprodajaOverview from '../maloprodaja/pages/MaloprodajaOverview';
import FinanceLandingPage from '../finance/FinanceLandingPage';
import HRLandingPage from '../hr/HRLandingPage';

export default function PlanikaSubmodule() {
  const { submoduleId } = useParams<{ submoduleId: string }>();
  const { t } = useTranslation();

  const submodule = useMemo(
    () => PLANIKA_SUBMODULES.find((item) => item.id === submoduleId),
    [submoduleId]
  );

  if (!submodule) {
    return <Navigate to="/planika" replace />;
  }

  // Route to Maloprodaja module for retail submodule
  if (submoduleId === 'retail') {
    return <MaloprodajaOverview />;
  }

  // Ljudski resursi — hub sa panelima
  if (submoduleId === 'hr') {
    return <HRLandingPage />;
  }

  // Finansije — hub sa panelima
  if (submoduleId === 'finance') {
    return <FinanceLandingPage />;
  }

  const heroStyles: Record<string, { accent: string; gradient: string }> = {
    orange: {
      accent: 'text-orange-600 dark:text-orange-400',
      gradient: 'from-white via-orange-50/40 to-amber-50/30 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900',
    },
    purple: {
      accent: 'text-purple-600 dark:text-purple-400',
      gradient: 'from-white via-purple-50/40 to-violet-50/30 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900',
    },
    yellow: {
      accent: 'text-amber-600 dark:text-amber-400',
      gradient: 'from-white via-amber-50/40 to-yellow-50/30 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900',
    },
  };
  const hero = heroStyles[submodule.color] ?? heroStyles.orange;

  return (
    <div className="space-y-8">
      <div
        className={`rounded-3xl border border-gray-200 bg-gradient-to-br ${hero.gradient} p-6 shadow-sm dark:border-dark-700 sm:p-8`}
      >
        <Link
          to="/planika"
          className="inline-block text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 sm:text-sm"
        >
          ← Planika
        </Link>
        <div className="mt-3">
          <p className={`text-sm font-medium uppercase tracking-[0.2em] ${hero.accent}`}>
            {t('planika.title')}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            {t(submodule.nameKey)}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-400 sm:text-base">
            {t(submodule.descriptionKey)}
          </p>
        </div>
      </div>

      <PlanikaSubmoduleAnimation
        submoduleId={submodule.id}
        color={submodule.color}
        className="max-w-xl"
      />

      <div className="card space-y-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Operativne funkcije
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {submodule.actions.map((actionKey) => (
            <div
              key={actionKey}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-800 border border-gray-100 dark:border-dark-700"
            >
              <span className="w-2 h-2 rounded-full bg-primary-500" />
              <span className="text-sm text-gray-700 dark:text-gray-200">
                {t(`planikaActions.${actionKey}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}












