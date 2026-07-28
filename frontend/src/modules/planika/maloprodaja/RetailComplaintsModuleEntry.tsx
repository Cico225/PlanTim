import ModuleAccessGuard from '@/components/ModuleAccessGuard';
import RetailComplaintsPage from './pages/RetailComplaintsPage';

export default function RetailComplaintsModuleEntry() {
  return (
    <ModuleAccessGuard moduleName="planika.maloprodaja.reklamacije">
      <RetailComplaintsPage />
    </ModuleAccessGuard>
  );
}
