import { cleanPhone } from './road-links';

export type QuickQuotePayment = 'cash' | 'card';

export const QUICK_QUOTE_HST_RATE = 0.13;

export interface QuickQuoteItem {
  serviceKey: string;
  extraUnits: number;
  linearFt: number;
  storey2?: boolean;            // Gutter Cleaning: 2-storey base $230+
  downspoutCustom?: boolean;    // Reattachment: New Downspout — Custom Quote Request
  rooflineNotes?: string;       // Christmas Lights: roofline notes
  customLinePrice?: number | null; // Christmas Lights: optional on-site price
}

export interface QuickQuoteRates {
  base: number;
  baseNote: string | null;
  extraUnitLabel: string | null;
  extraUnitCost: number;
  usesLinearFt: boolean;
  linearFtBlock: number;
  linearFtBlockCost: number;
  customQuoteOnly?: boolean;
}

// Exact rates per the service catalog: base price covers the first unit;
// the extra-unit counter prices each additional leak/section/vent/window.
const QUICK_QUOTE_RATES: Record<string, QuickQuoteRates> = {
  'gutter-cleaning': { base: 190, baseNote: null, extraUnitLabel: 'Extra Leaks', extraUnitCost: 40, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'leak-sealing': { base: 190, baseNote: null, extraUnitLabel: 'Extra Leaks', extraUnitCost: 40, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'reattachment-services': { base: 170, baseNote: null, extraUnitLabel: 'Extra Sections', extraUnitCost: 25, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'window-caulking': { base: 250, baseNote: null, extraUnitLabel: null, extraUnitCost: 0, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'window-cleaning': { base: 230, baseNote: '10–12 Windows ($230)', extraUnitLabel: 'Additional Windows', extraUnitCost: 30, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'vent-replacement': { base: 120, baseNote: null, extraUnitLabel: 'Extra Vents', extraUnitCost: 30, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'heated-wire-cable-installation': { base: 0, baseNote: null, extraUnitLabel: null, extraUnitCost: 0, usesLinearFt: true, linearFtBlock: 25, linearFtBlockCost: 150 },
  'christmas-lights-installation-removal': {
    base: 0, baseNote: 'Custom Quote Request (Based on Home Size & Roofline)',
    extraUnitLabel: null, extraUnitCost: 0, usesLinearFt: false,
    linearFtBlock: 25, linearFtBlockCost: 0, customQuoteOnly: true,
  },
};

export function quickQuoteRates(serviceKey: string): QuickQuoteRates {
  return QUICK_QUOTE_RATES[serviceKey] || { base: 0, baseNote: null, extraUnitLabel: null, extraUnitCost: 0, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 };
}

export const GUTTER_2_STOREY_BASE = 230;

export function priceQuickQuoteItem(item: QuickQuoteItem): number {
  const r = quickQuoteRates(item.serviceKey);
  if (r.customQuoteOnly) {
    return item.customLinePrice && item.customLinePrice > 0 ? item.customLinePrice : 0;
  }
  let base = r.base;
  if (item.serviceKey === 'gutter-cleaning' && item.storey2) base = GUTTER_2_STOREY_BASE;
  let subtotal = base;
  if (r.extraUnitCost > 0) subtotal += r.extraUnitCost * item.extraUnits;
  if (r.usesLinearFt && item.linearFt > 0) {
    subtotal += Math.ceil(item.linearFt / r.linearFtBlock) * r.linearFtBlockCost;
  }
  return Math.round(subtotal * 100) / 100;
}

export function quickQuoteTotal(items: QuickQuoteItem[], payment: QuickQuotePayment, customPrice: number | null = null): { subtotal: number; hst: number; total: number } {
  const subtotal = customPrice !== null && customPrice > 0
    ? customPrice
    : Math.round(items.reduce((s, i) => s + priceQuickQuoteItem(i), 0) * 100) / 100;
  const hst = payment === 'cash' ? 0 : Math.round(subtotal * QUICK_QUOTE_HST_RATE * 100) / 100;
  return { subtotal, hst, total: Math.round((subtotal + hst) * 100) / 100 };
}

export function satelliteMapUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export const CHRISTMAS_KEY = 'christmas-lights-installation-removal';

export function quoteItemDetails(item: QuickQuoteItem): string {
  const r = quickQuoteRates(item.serviceKey);
  if (item.serviceKey === CHRISTMAS_KEY) {
    const parts: string[] = ['Custom Quote Request (based on home size/roofline)'];
    if (item.linearFt > 0) parts.push(`${item.linearFt} lin ft`);
    if (item.rooflineNotes?.trim()) parts.push(item.rooflineNotes.trim());
    if (item.customLinePrice && item.customLinePrice > 0) return parts.slice(1).join(', ');
    return parts.join(', ');
  }
  const parts: string[] = [];
  if (item.serviceKey === 'gutter-cleaning' && item.storey2) parts.push('2-Storey ($230+ depending on size/buildup)');
  if (r.extraUnitCost > 0 && item.extraUnits > 0) {
    parts.push(`${item.extraUnits} ${r.extraUnitLabel || 'Extra'}`);
  }
  if (r.usesLinearFt && item.linearFt > 0) parts.push(`${item.linearFt} lin ft`);
  if (item.serviceKey === 'reattachment-services' && item.downspoutCustom) {
    parts.push('New Downspout — Custom Quote Request');
  }
  return parts.join(', ');
}

export interface QuickQuoteMessageItem {
  label: string;
  details: string;
  subtotal: number;
}

export function quoteWhatsAppMessage(
  customerName: string,
  address: string,
  items: QuickQuoteMessageItem[],
  payment: QuickQuotePayment,
  customSubtotal: number | null = null,
): string {
  const lines = items.map(i => {
    const isCustomRequest = i.details.includes('Custom Quote Request');
    if (isCustomRequest) {
      return `- ${i.label} — ${i.details}`;
    }
    return `- ${i.label}${i.details ? ` (${i.details})` : ''} — $${i.subtotal.toFixed(2)}`;
  });
  const subtotal = customSubtotal !== null && customSubtotal > 0
    ? customSubtotal
    : Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
  const hst = payment === 'cash' ? 0 : Math.round(subtotal * QUICK_QUOTE_HST_RATE * 100) / 100;
  const total = Math.round((subtotal + hst) * 100) / 100;
  const paymentNote = payment === 'cash'
    ? 'Paying by cash (no HST).'
    : 'Paying by e-Transfer or card (+13% HST).';
  return [
    `Hi ${customerName.trim().split(/\s+/)[0] || 'there'}, here is your quick quote from Masbling Astar Services for ${address}:`,
    '',
    ...lines,
    '',
    hst > 0 ? `HST (13%): $${hst.toFixed(2)}` : 'HST: $0.00 (cash payment)',
    `Total: $${total.toFixed(2)}`,
    '',
    paymentNote,
    'Reply to confirm and we will lock in your spot! #MasblingAstarServices',
  ].join('\n');
}

export function seasonalCheckInMessage(customerName: string): string {
  const month = new Date().getMonth();
  const season = month >= 2 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 10 ? 'fall' : 'winter';
  const body = season === 'fall'
    ? 'Fall is here — now is the perfect time for a gutter cleanout before the leaves finish dropping and the freeze sets in.'
    : season === 'spring'
      ? 'Spring is here — now is the perfect time for a gutter cleanout to clear winter debris before the spring rains.'
      : 'A quick reminder that regular gutter and exterior maintenance keeps your home protected year-round.';
  return `Hi ${customerName.trim().split(/\s+/)[0] || 'there'}! ${body} Masbling Astar Services is booking seasonal cleanouts now — want us to reserve your spot? Reply YES and we will take care of it. #MasblingAstarServices`;
}

export function waUrl(phone: string, message: string): string {
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(message)}`;
}
