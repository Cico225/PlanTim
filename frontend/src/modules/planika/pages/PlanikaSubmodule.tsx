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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            {t('planika.title')}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t(submodule.nameKey)}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 max-w-3xl">
            {t(submodule.descriptionKey)}
          </p>
        </div>
        <Link
          to="/planika"
          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          ← {t('planika.title')}
        </Link>
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












