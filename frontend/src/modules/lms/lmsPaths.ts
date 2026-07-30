/** Frontend base path for retail LMS (existing courses, quizzes, etc.) */
export const LMS_RETAIL_BASE = '/lms/maloprodaja';

/** Frontend path for direction LMS hub (placeholder / future) */
export const LMS_DIREKCIJA_BASE = '/lms/direkcija';

export function lmsRetailPath(path = ''): string {
  if (!path || path === '/') return LMS_RETAIL_BASE;
  return `${LMS_RETAIL_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
