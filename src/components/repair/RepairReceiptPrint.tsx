import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTenant } from '@/context/TenantContext';
import { RepairOrder } from '@/types/repair';
import { buildStoreUrl } from '@/lib/utils/store-url';
import '@/styles/repair-print.css'; // The new Modular CSS
import { DEFAULT_REPAIR_RECEIPT_SETTINGS, RepairReceiptSettings } from '@/hooks/useRepairReceiptSettings';
import { Phone, MapPin, Calendar, User, Smartphone, CreditCard, Scissors, Wrench } from 'lucide-react';

// ============================================================================
// HELPERS
// ============================================================================
const convertToEnglishNumbers = (num: number | string) => {
  if (num === null || num === undefined) return '';
  return num.toString().replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-EG', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) { return dateString; }
};

// ============================================================================
// COMPONENT
// ============================================================================

interface RepairReceiptPrintProps {
  order: RepairOrder;
  storeName: string;
  storePhone?: string;
  storeAddress?: string;
  storeLogo?: string;
  trackingUrl: string; // Passed from parent (usually calculated) or we recalc
  queuePosition?: number;
  receiptSettings?: Partial<RepairReceiptSettings>;
}

const RepairReceiptPrint: React.FC<RepairReceiptPrintProps> = ({
  order,
  storeName,
  storePhone,
  storeAddress,
  storeLogo,
  trackingUrl: propTrackingUrl,
  queuePosition,
  receiptSettings
}) => {
  const { currentOrganization } = useTenant();

  // Settings Merge
  const s: RepairReceiptSettings = useMemo(() => ({
    ...DEFAULT_REPAIR_RECEIPT_SETTINGS,
    ...(receiptSettings || {})
  }), [receiptSettings]);

  // Logic & URLs
  const trackingCode = order.repair_tracking_code || order.order_number || order.id?.slice(0, 8);

  // Safe Subdomain extraction
  const getSubdomain = (org: any) => {
    if (!org) return '';
    if (typeof org === 'string') return org;
    return org.subdomain || org.slug || org.domain || 'www';
  };
  const subdomain = getSubdomain(currentOrganization);
  const storeUrl = buildStoreUrl(subdomain);

  // URLs
  const finalTrackingUrl = propTrackingUrl && propTrackingUrl.includes('http')
    ? propTrackingUrl
    : `${storeUrl}/repair-tracking/${trackingCode}`;

  const adminActionUrl = `${storeUrl}/admin/repair-orders/${order.id}`;

  // Financials
  const isPriceUnknown = !!order.price_to_be_determined_later;
  const total = order.total_price || 0;
  const paid = order.paid_amount || 0;
  const remaining = isPriceUnknown ? 0 : Math.max(0, total - paid);

  // Render Icons (Helper to keep JSX clean)
  const Icon = ({ i: C, size = 12 }: { i: any, size?: number }) => (
    <span style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '4px' }}>
      <C size={size} strokeWidth={2.5} />
    </span>
  );

  return (
    <div className="repair-receipt">

      {/* ================================================================== 
         CUSTOMER COPY 
      ================================================================== */}
      {s.showCustomerReceipt && (
        <div className="rr-customer-section">

          {/* 1. BRAND HEADER */}
          <div className="rr-header">
            {s.showStoreLogo && storeLogo && (
              <img src={storeLogo} alt="Logo" className="rr-logo" style={{ maxHeight: '60px' }} />
            )}
            <h1 style={{ fontSize: '18px', fontWeight: 900, margin: '4px 0' }}>{storeName}</h1>
            {s.showStoreInfo && (
              <div style={{ fontSize: '11px', fontWeight: 500 }}>
                {storeAddress && <span>{storeAddress}</span>}
                {storePhone && (
                  <div className="rr-value ltr" style={{ marginTop: '2px' }}>
                    <Icon i={Phone} size={10} /> {convertToEnglishNumbers(storePhone)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. META STRIP */}
          <div className="rr-meta-strip">
            <span>#{convertToEnglishNumbers(order.id?.slice(0, 6) || '')}</span>
            <span>{formatDate(order.created_at)}</span>
          </div>

          {/* 3. HERO BLOCK (ORDER #) */}
          <div className="rr-hero-block">
            <div className="rr-hero-label">رقم الطلب ORDER NO</div>
            <div className="rr-hero-value rr-value ltr">
              #{convertToEnglishNumbers(order.order_number || '---')}
            </div>
            {s.showQueuePosition && queuePosition && queuePosition > 0 && (
              <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 700 }}>
                الدور: <span style={{ background: '#000', color: '#fff', padding: '0 4px', borderRadius: '2px' }}>{queuePosition}</span>
              </div>
            )}
          </div>

          {/* 4. CUSTOMER CARD */}
          <div className="rr-card">
            <div className="rr-card-header">
              <span>بيانات العميل</span>
              <User size={12} />
            </div>
            <div className="rr-card-body">
              <div className="rr-row">
                <span className="rr-label">الاسم</span>
                <span className="rr-value">{order.customer_name}</span>
              </div>
              <div className="rr-row">
                <span className="rr-label">الهاتف</span>
                <span className="rr-value ltr">{convertToEnglishNumbers(order.customer_phone)}</span>
              </div>
            </div>
          </div>

          {/* 5. DEVICE CARD */}
          <div className="rr-card">
            <div className="rr-card-header">
              <span>الجهاز والمشكلة</span>
              <Smartphone size={12} />
            </div>
            <div className="rr-card-body">
              <div className="rr-row">
                <span className="rr-label">الجهاز</span>
                <span className="rr-value xl">{order.device_type}</span>
              </div>
              {order.issue_description && (
                <div style={{ marginTop: '4px', borderTop: '1px dashed #ccc', paddingTop: '4px' }}>
                  <div className="rr-desc-text">{order.issue_description}</div>
                </div>
              )}
            </div>
          </div>

          {/* 6. FINANCIALS */}
          <div className="rr-card">
            <div className="rr-card-header">
              <span>الدفع</span>
              <CreditCard size={12} />
            </div>
            <div className="rr-card-body">
              {isPriceUnknown ? (
                <div style={{ textAlign: 'center', fontWeight: 'bold' }}>⚠️ السعر يحدد لاحقاً</div>
              ) : (
                <>
                  <div className="rr-row">
                    <span className="rr-label">الإجمالي</span>
                    <span className="rr-value ltr">{convertToEnglishNumbers(total)} DA</span>
                  </div>
                  <div className="rr-row">
                    <span className="rr-label">المدفوع</span>
                    <span className="rr-value ltr">{convertToEnglishNumbers(paid)} DA</span>
                  </div>
                  {remaining > 0 && (
                    <div className="rr-total-block">
                      <div className="rr-total-row">
                        <span>الباقي</span>
                        <span className="rr-value ltr" style={{ fontSize: '16px' }}>{convertToEnglishNumbers(remaining)} DA</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 7. TRACKING QR */}
          {s.showTrackingQr && (
            <div className="rr-tracking-block">
              <div style={{ marginBottom: '5px', fontWeight: 800, fontSize: '11px' }}>تتبع حالة جهازك</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <QRCodeSVG value={finalTrackingUrl} size={s.trackingQrSize || 90} level="M" />
              </div>
              <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: 600 }}>Scan to Track</div>
            </div>
          )}

          {/* 8. FOOTER TERMS */}
          {s.showWarrantyAndTerms && (
            <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '9px', fontWeight: 500 }}>
              <p>تطبق الشروط والأحكام. ضمان الصيانة 30 يوماً على القطع المستبدلة فقط.</p>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== 
         ADMIN STICKER (Separate "Cut" Section)
      ================================================================== */}
      {s.showAdminReceipt && (
        <>
          <div className="rr-cut-separator">
            <div className="rr-cut-icon"><Scissors size={14} /></div>
          </div>

          <div className="rr-admin-stub">
            <div className="rr-admin-header">INTERNAL TICKET (ملصق الجهاز)</div>

            {/* Split Top: ID and Device */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <div style={{ fontWeight: 900, fontSize: '24px' }}>#{convertToEnglishNumbers(order.order_number || order.id?.slice(0, 4))}</div>
              <div style={{ fontWeight: 700, fontSize: '10px' }}>{formatDate(order.created_at)}</div>
            </div>

            <div style={{ borderBottom: '2px solid #000', marginBottom: '5px' }}></div>

            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 900 }}>{order.device_type}</div>
              <div className="rr-desc-text" style={{ fontSize: '10px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {order.customer_name} - {convertToEnglishNumbers(order.customer_phone)}
              </div>
            </div>

            {/* Bottom: Issues + Action QR */}
            <div style={{ display: 'flex', gap: '5px', alignItems: 'stretch' }}>
              {/* Left: Issue Summary */}
              <div style={{ flex: 1, textAlign: 'right', border: '1px dashed #000', padding: '4px', borderRadius: '4px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700 }}>العطل:</div>
                <div style={{ fontSize: '10px', lineHeight: 1.1 }}>{order.issue_description?.substring(0, 50)}...</div>
              </div>

              {/* Right: QR */}
              {s.showCompleteQr && (
                <div style={{ width: '50px', flexShrink: 0 }}>
                  <QRCodeSVG value={adminActionUrl} size={50} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default RepairReceiptPrint;
