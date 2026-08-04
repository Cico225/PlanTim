import type { CSSProperties } from 'react';
import { RetailComplaint } from '@/types/retail-complaints';

type ComplaintRejectionLetterProps = {
  complaint: Pick<
    RetailComplaint,
    | 'id'
    | 'complaint_number'
    | 'customer_name'
    | 'customer_address'
    | 'customer_city'
    | 'article_code'
    | 'article_price'
    | 'receipt_number'
    | 'purchase_date'
    | 'store_name'
    | 'admin_response'
    | 'reviewed_at'
    | 'created_at'
  >;
  responseText?: string;
};

function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('bs-BA');
}

function formatPrice(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(2);
}

function protocolNumber(complaint: { id: number; complaint_number?: string; created_at?: string }) {
  const year = (complaint.created_at ? new Date(complaint.created_at) : new Date()).getFullYear().toString().slice(-2);
  return `${complaint.id}/${year}`;
}

const pageStyle: CSSProperties = {
  width: '100%',
  maxWidth: '210mm',
  margin: '0 auto',
  background: '#fff',
  color: '#111',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '12px',
  lineHeight: 1.45,
  padding: '14mm 16mm',
  boxSizing: 'border-box',
};

const highlight: CSSProperties = {
  background: '#ececec',
  padding: '2px 6px',
  display: 'inline-block',
  minWidth: '140px',
};

export default function ComplaintRejectionLetter({
  complaint,
  responseText,
}: ComplaintRejectionLetterProps) {
  const letterDate = formatDate(complaint.reviewed_at || complaint.created_at) || formatDate(new Date().toISOString());
  const purchaseDate = formatDate(complaint.purchase_date);
  const response = (responseText ?? complaint.admin_response ?? '').trim();
  const article = complaint.article_code?.trim() || 'artikal';
  const store = complaint.store_name?.trim() || 'prodajnom objektu';
  const price = formatPrice(complaint.article_price);
  const receipt = complaint.receipt_number?.trim() || '—';

  return (
    <div className="complaint-rejection-letter" style={pageStyle}>
      <style>
        {`
          @media print {
            .complaint-rejection-letter {
              padding: 0 !important;
              max-width: none !important;
            }
          }
        `}
      </style>

      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            fontStyle: 'italic',
            color: '#8b1c24',
            lineHeight: 1,
          }}
        >
          Planika
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: '#333' }}>
          Planika Flex Sarajevo promet i usluge d.o.o.
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.85fr',
          gap: 24,
          marginBottom: 22,
        }}
      >
        <div style={{ fontSize: 11, color: '#222', lineHeight: 1.5 }}>
          <div>71000 Sarajevo BiH, Maršala Tita br. 39.</div>
          <div>Tel (+387 33) 768 905 · Fax (+387 33) 768 907</div>
          <div>E-mail: info@planika.ba · www.planika.ba</div>
          <div>JIB: 4200445510002 · Poreski broj: 01632043</div>
          <div>Reg. Kant. suda Sarajevo BROJ I-1080/02</div>
          <div style={{ marginTop: 8, fontWeight: 700 }}>TRANSAKCIJSKI RAČUNI:</div>
          <div>Intesa Sanpaolo Banka d.d. · 1540012005042539</div>
          <div>Unicredit Bank d.d. · 3386902200412637</div>
          <div>NLB Razvojna banka a.d. · 1548903010011937</div>
        </div>

        <div style={{ fontSize: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>DATUM:</strong> <span style={highlight}>{letterDate}</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>BR. PROT:</strong> <span style={highlight}>{protocolNumber(complaint)}</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>PRIMA:</strong>{' '}
            <span style={highlight}>{(complaint.customer_name || '').toUpperCase()}</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>ADRESA:</strong>{' '}
            <span style={highlight}>{(complaint.customer_address || '').toUpperCase()}</span>
          </div>
          <div>
            <strong>GRAD:</strong>{' '}
            <span style={highlight}>{(complaint.customer_city || '').toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>PREDMET:</strong> Reklamacija po računu: {receipt}
        {purchaseDate ? ` od ${purchaseDate}` : ''}.
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong>ODGOVOR</strong>
      </div>

      <div style={{ marginBottom: 14 }}>Poštovani,</div>

      <p style={{ marginBottom: 14 }}>
        Obavještavamo Vas da reklamacija na art. <strong>{article}</strong>, kupljen u našem prodajnom
        objektu <strong>{store}</strong>, po cijeni od <strong>{price} KM</strong> nije prihvaćena.
      </p>

      <p style={{ marginBottom: 14, minHeight: 56, whiteSpace: 'pre-wrap' }}>
        {response || '_______________________________________________'}
      </p>

      <p style={{ marginBottom: 14 }}>
        Vaš reklamirani artikal možete preuzeti u prodavnici u kojoj ste izvršili reklamaciju.
      </p>

      <p style={{ marginBottom: 28 }}>Lijepo Vas pozdravljamo,</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          marginTop: 40,
        }}
      >
        <div>
          <div style={{ marginBottom: 18 }}>Reklamirani artikal preuzeo/la</div>
          <div style={{ marginBottom: 14 }}>Potpis: __________________________</div>
          <div>Datum: __________________________</div>
        </div>
        <div style={{ textAlign: 'right', paddingTop: 28 }}>
          <div style={{ fontWeight: 600 }}>Planika flex d.o.o. Sarajevo</div>
        </div>
      </div>
    </div>
  );
}

export function buildDefaultRejectionResponse(complaint: {
  defect_description?: string | null;
}): string {
  if (complaint.defect_description?.trim()) {
    return `Na osnovu uvida u reklamirani artikal utvrđeno je da prijavljeno oštećenje nije rezultat greške u proizvodnji. ${complaint.defect_description.trim()}`;
  }
  return 'Na osnovu uvida u reklamirani artikal utvrđeno je da prijavljeno oštećenje nije rezultat greške u proizvodnji već posljedica vanjskog fizičkog utjecaja.';
}
