import {
  COMPLAINT_STATUS_LABELS,
  ComplaintStatus,
  RetailComplaint,
  isComplaintSubmitted,
} from '@/types/retail-complaints';

const STATUS_TONE: Record<ComplaintStatus, string> = {
  zaprimljena: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  odobrena: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  odbijena: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
};

export function getComplaintPhaseLabel(complaint: Pick<RetailComplaint, 'status' | 'submitted_at'>) {
  if (complaint.status === 'odobrena') return 'Odobreno';
  if (complaint.status === 'odbijena') return 'Odbijeno';
  if (isComplaintSubmitted(complaint)) return 'Kod direkcije';
  return 'U prodavnici';
}

export function ComplaintStatusBadge({
  status,
  size = 'md',
}: {
  status: ComplaintStatus;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${STATUS_TONE[status] || STATUS_TONE.zaprimljena} ${
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      {COMPLAINT_STATUS_LABELS[status] || status}
    </span>
  );
}

export { COMPLAINT_STATUS_LABELS };
