import { Route, Routes } from 'react-router-dom';
import ComplaintsList from './ComplaintsList';
import ComplaintCreatePage from './ComplaintCreatePage';
import ComplaintDetailPage from './ComplaintDetailPage';

export default function RetailComplaintsPage() {
  return (
    <Routes>
      <Route index element={<ComplaintsList />} />
      <Route path="nova" element={<ComplaintCreatePage />} />
      <Route path=":id" element={<ComplaintDetailPage />} />
    </Routes>
  );
}
