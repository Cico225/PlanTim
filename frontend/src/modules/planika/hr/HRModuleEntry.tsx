import { Link, Navigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import HRMOverview from '@/modules/hrm/pages/HRMOverview';
import { getHRPanel, HR_PANELS, type HRSectionKey } from './HRLandingPage';

const VALID_SECTIONS = HR_PANELS.map((panel) => panel.id);

export default function HRModuleEntry() {
  const { section } = useParams<{ section: string }>();
  const panel = getHRPanel(section);

  if (!section || !VALID_SECTIONS.includes(section as HRSectionKey) || !panel) {
    return <Navigate to="/planika/hr" replace />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/planika/hr"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiArrowLeft size={16} />
            Ljudski resursi
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            {panel.title}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{panel.description}</p>
        </div>
      </div>

      <HRMOverview initialTab={section as HRSectionKey} hideNavigation />
    </div>
  );
}
