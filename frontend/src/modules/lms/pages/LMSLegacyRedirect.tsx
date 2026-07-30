import { Navigate, useLocation } from 'react-router-dom';

/** Redirect old /lms/... URLs to /lms/maloprodaja/... */
export default function LMSLegacyRedirect() {
  const location = useLocation();
  const rest = location.pathname.replace(/^\/lms/, '') || '';
  return <Navigate to={`/lms/maloprodaja${rest}${location.search}`} replace />;
}
