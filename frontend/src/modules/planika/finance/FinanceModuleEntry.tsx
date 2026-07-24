import ModuleAccessGuard from '@/components/ModuleAccessGuard';
import FinanceOverview from './FinanceOverview';

export default function FinanceModuleEntry() {
  return (
    <ModuleAccessGuard moduleName="planika.finance.krediti">
      <FinanceOverview />
    </ModuleAccessGuard>
  );
}
