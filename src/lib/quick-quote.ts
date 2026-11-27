import { cleanPhone } from './road-links';

export type QuickQuotePayment = 'cash' | 'card';

export const QUICK_QUOTE_HST_RATE = 0.13;

export interface QuickQuoteItem {
  serviceKey: string;
  extraUnits: number;
  linearFt: number;
}

export interface QuickQuoteRates {
  base: number;
  extraUnitLabel: string | null;
  extraUnitCost: number;
  usesLinearFt: boolean;
  linearFtBlock: number;
  linearFtBlockCost: number;
}

// Exact rates per the service catalog: base price covers the first unit;
// the extra-unit counter prices each additional leak/section/vent.
const QUICK_QUOTE_RATES: Record<string, QuickQuoteRates> = {
  'gutter-cleaning': { base: 190, extraUnitLabel: 'Extra Leaks', extraUnitCost: 40, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'leak-sealing': { base: 190, extraUnitLabel: 'Extra Leaks', extraUnitCost: 40, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'reattachment-services': { base: 150, extraUnitLabel: 'Extra Sections', extraUnitCost: 25, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'window-caulking': { base: 150, extraUnitLabel: null, extraUnitCost: 0, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'window-cleaning': { base: 150, extraUnitLabel: null, extraUnitCost: 0, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'vent-replacement': { base: 120, extraUnitLabel: 'Extra Vents', extraUnitCost: 30, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
  'heated-wire-cable-installation': { base: 0, extraUnitLabel: null, extraUnitCost: 0, usesLinearFt: true, linearFtBlock: 25, linearFtBlockCost: 150 },
  'christmas-lights-installation-removal': { base: 200, extraUnitLabel: null, extraUnitCost: 0, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 },
};

export function quickQuoteRates(serviceKey: string): QuickQuoteRates {
  return QUICK_QUOTE_RATES[serviceKey] || { base: 0, extraUnitLabel: null, extraUnitCost: 0, usesLinearFt: false, linearFtBlock: 25, linearFtBlockCost: 0 };
}

export function priceQuickQuoteItem(item: QuickQuoteItem): number {
  const r = quickQuoteRates(item.serviceKey);
  let subtotal = r.base;
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

export function quoteItemDetails(item: QuickQuoteItem): string {
  const r = quickQuoteRates(item.serviceKey);
  const parts: string[] = [];
  if (r.extraUnitCost > 0 && item.extraUnits > 0) {
    parts.push(`${item.extraUnits} ${r.extraUnitLabel || 'Extra'}${item.extraUnits !== 1 ? '' : ''}`);
  }
  if (r.usesLinearFt && item.linearFt > 0) parts.push(`${item.linearFt} lin ft`);
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
  const lines = items.map(i => `- ${i.label}${i.details ? ` (${i.details})` : ''} — ${i.subtotal.toFixed(2)}`);
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
