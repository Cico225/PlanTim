import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import ModuleAccessGuard from '@/components/ModuleAccessGuard';
import ContractCompaniesPage from './ContractCompaniesPage';

export default function ActiveContractsPage() {
  return (
    <ModuleAccessGuard moduleName="planika.finance.ugovori">
      <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-x-hidden">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Planika</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Spiskovi aktivnih ugovora
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Firme sa potpisanim ugovorom, uvoz iz Excel-a i spiskovi uposlenika
            </p>
          </div>
          <Link
            to="/planika/finance"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            <FiArrowLeft size={16} />
            Finansije
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ContractCompaniesPage />
        </div>
      </div>
    </ModuleAccessGuard>
  );
}
