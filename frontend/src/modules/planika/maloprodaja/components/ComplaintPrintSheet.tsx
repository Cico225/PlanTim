import type { CSSProperties } from 'react';
import { PAYMENT_METHODS, RetailComplaint } from '@/types/retail-complaints';

type ComplaintPrintSheetProps = {
  complaint: Pick<
    RetailComplaint,
    | 'complaint_number'
    | 'customer_name'
    | 'customer_address'
    | 'customer_phone'
    | 'customer_city'
    | 'customer_email'
    | 'article_code'
    | 'article_price'
    | 'payment_method'
    | 'receipt_number'
    | 'purchase_date'
    | 'defect_description'
    | 'created_at'
    | 'store_name'
  >;
};

const paymentLabelMap = new Map(PAYMENT_METHODS.map((item) => [item.value, item.label]));

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: '11px',
  color: '#111',
  background: '#fff',
};

const cell: CSSProperties = {
  border: '1px solid #111',
  padding: '5px 7px',
  verticalAlign: 'middle',
  lineHeight: 1.25,
};

const labelCell: CSSProperties = {
  ...cell,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  width: '88px',
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('bs-BA');
}

function formatPrice(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '';
  return Number(value).toFixed(2);
}

function val(value?: string | null) {
  return value?.trim() || '';
}

function ComplaintCopy({ complaint }: ComplaintPrintSheetProps) {
  const paymentMethod =
    paymentLabelMap.get(complaint.payment_method || '') || val(complaint.payment_method);

  return (
    <table style={tableStyle}>
      <colgroup>
        <col style={{ width: '14%' }} />
        <col style={{ width: '28%' }} />
        <col style={{ width: '14%' }} />
        <col style={{ width: '16%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '16%' }} />
      </colgroup>
      <tbody>
        {/* Kupac + logo */}
        <tr>
          <td style={labelCell}>Kupac :</td>
          <td style={cell} colSpan={3}>
            {val(complaint.customer_name)}
          </td>
          <td
            rowSpan={6}
            colSpan={2}
            style={{
              ...cell,
              textAlign: 'center',
              verticalAlign: 'middle',
              background: '#f3f3f3',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 800,
                fontStyle: 'italic',
                color: '#a10f1e',
                lineHeight: 1,
              }}
            >
              Planika
            </div>
            <div style={{ marginTop: 6, fontSize: 9, letterSpacing: '0.04em' }}>
              {val(complaint.complaint_number)}
            </div>
          </td>
        </tr>
        <tr>
          <td style={labelCell}>Adresa :</td>
          <td style={cell} colSpan={3}>
            {val(complaint.customer_address)}
          </td>
        </tr>
        <tr>
          <td style={labelCell}>Telefon :</td>
          <td style={cell} colSpan={3}>
            {val(complaint.customer_phone)}
          </td>
        </tr>
        <tr>
          <td style={labelCell}>Mjesto :</td>
          <td style={cell} colSpan={3}>
            {val(complaint.customer_city)}
          </td>
        </tr>
        <tr>
          <td style={labelCell}>Datum :</td>
          <td style={cell} colSpan={3}>
            {formatDate(complaint.created_at)}
          </td>
        </tr>
        <tr>
          <td style={labelCell}>E-mail :</td>
          <td style={cell} colSpan={3}>
            {val(complaint.customer_email)}
          </td>
        </tr>

        {/* Naslov */}
        <tr>
          <td
            colSpan={6}
            style={{
              ...cell,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              padding: '8px 6px',
            }}
          >
            Zahtjev za reklamaciju
          </td>
        </tr>

        {/* Artikal */}
        <tr>
          <td style={labelCell}>ŠIFRA:</td>
          <td style={cell}>{val(complaint.article_code)}</td>
          <td style={{ ...labelCell, width: 'auto' }}>Artikal :</td>
          <td style={cell}>{val(complaint.article_code)}</td>
          <td style={{ ...labelCell, width: 'auto' }}>veličina:</td>
          <td style={cell}>&nbsp;</td>
        </tr>
        <tr>
          <td style={labelCell}>CIJENA:</td>
          <td style={cell}>{formatPrice(complaint.article_price)}</td>
          <td style={{ ...cell, textAlign: 'center', fontWeight: 600, width: 40 }}>KM</td>
          <td style={cell}>
            <strong>,br. Računa:</strong> {val(complaint.receipt_number)}
          </td>
          <td style={cell} colSpan={2}>
            <strong>Datum kupovine:</strong> {formatDate(complaint.purchase_date)}
          </td>
        </tr>
        <tr>
          <td style={{ ...labelCell, width: 130 }} colSpan={1}>
            Način plaćanja :
          </td>
          <td style={cell} colSpan={5}>
            {paymentMethod}
          </td>
        </tr>

        {/* Opis greške */}
        <tr>
          <td style={{ ...labelCell, borderBottom: 'none' }} colSpan={6}>
            OPIS GREŠKE:
          </td>
        </tr>
        <tr>
          <td style={{ ...cell, height: 72, verticalAlign: 'top' }} colSpan={6}>
            {val(complaint.defect_description)}
          </td>
        </tr>

        {/* Potpisi */}
        <tr>
          <td style={{ ...cell, height: 42, verticalAlign: 'top' }} colSpan={2}>
            Zahtjev primio:
          </td>
          <td style={{ ...cell, textAlign: 'center', verticalAlign: 'middle' }} colSpan={1}>
            M.P.
          </td>
          <td style={{ ...cell, height: 42, verticalAlign: 'top' }} colSpan={3}>
            Potpis kupca:
          </td>
        </tr>

        {/* Odgovor + DA/NE */}
        <tr>
          <td
            style={{ ...cell, verticalAlign: 'top', height: 56, borderBottom: '1px solid #111' }}
            colSpan={4}
            rowSpan={2}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>ODGOVOR NA REKLAMACIJU:</div>
          </td>
          <td style={{ ...cell, fontWeight: 700, textAlign: 'center', fontSize: 10 }} colSpan={2}>
            PRISTAJEM NA DORADU PROIZVODA:
          </td>
        </tr>
        <tr>
          <td style={{ ...cell, textAlign: 'center', fontWeight: 700, height: 28 }}>DA</td>
          <td style={{ ...cell, textAlign: 'center', fontWeight: 700, height: 28 }}>NE</td>
        </tr>
      </tbody>
    </table>
  );
}

export default function ComplaintPrintSheet({ complaint }: ComplaintPrintSheetProps) {
  return (
    <div className="complaint-print-sheet mx-auto w-full max-w-[210mm] bg-white text-black">
      <style>
        {`
          @media print {
            .complaint-print-sheet table,
            .complaint-print-sheet td {
              border-color: #111 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ComplaintCopy complaint={complaint} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '4px 0',
          }}
        >
          <div style={{ flex: 1, borderTop: '1px dashed #666' }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#555',
            }}
          >
            Odvojiti po liniji
          </span>
          <div style={{ flex: 1, borderTop: '1px dashed #666' }} />
        </div>
        <ComplaintCopy complaint={complaint} />
      </div>
    </div>
  );
}
