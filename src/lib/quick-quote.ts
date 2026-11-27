import { cleanPhone } from './road-links';

export interface QuickQuoteItem {
  serviceKey: string;
  quantity: number;
  linearFt: number;
  extraLeaks: number;
}

export type QuickQuotePayment = 'cash' | 'card';

export interface QuickQuotePricing {
  unit: number;
  linearFtCost: number;
  extraLeakCost: number;
  extraLeakUnitCost: number;
  subtotal: number;
  hst: number;
  total: number;
}

export const QUICK_QUOTE_HST_RATE = 0.13;

// Per-unit pricing for the 8 catalog services (base call + per linear ft
// + optional extra-leak counters where it applies).
const QUICK_QUOTE_RATES: Record<string, { base: number; perUnit: number; perLinearFt: number; extraLeak: number }> = {
  'gutter-cleaning': { base: 0, perUnit: 0, perLinearFt: 3.5, extraLeak: 25 },
  'leak-sealing': { base: 0, perUnit: 0, perLinearFt: 4, extraLeak: 30 },
  'reattachment-services': { base: 0, perUnit: 0, perLinearFt: 6, extraLeak: 0 },
  'window-caulking': { base: 0, perUnit: 85, perLinearFt: 0, extraLeak: 0 },
  'window-cleaning': { base: 0, perUnit: 40, perLinearFt: 0, extraLeak: 0 },
  'vent-replacement': { base: 0, perUnit: 150, perLinearFt: 0, extraLeak: 0 },
  'heated-wire-cable-installation': { base: 0, perUnit: 0, perLinearFt: 9, extraLeak: 0 },
  'christmas-lights-installation-removal': { base: 0, perUnit: 120, perLinearFt: 2.5, extraLeak: 0 },
};

export function priceQuickQuoteItem(item: QuickQuoteItem): QuickQuotePricing {
  const rate = QUICK_QUOTE_RATES[item.serviceKey] || { base: 0, perUnit: 0, perLinearFt: 0, extraLeak: 0 };
  const unit = rate.base + rate.perUnit * item.quantity;
  const linearFtCost = rate.perLinearFt * item.linearFt;
  const extraLeakUnitCost = rate.extraLeak;
  const extraLeakCost = rate.extraLeak * item.extraLeaks;
  const subtotal = Math.round((unit + linearFtCost + extraLeakCost) * 100) / 100;
  const hst = Math.round(subtotal * QUICK_QUOTE_HST_RATE * 100) / 100;
  return { unit, linearFtCost, extraLeakCost, extraLeakUnitCost, subtotal, hst, total: subtotal + hst };
}

export function quickQuoteTotal(items: QuickQuoteItem[], payment: QuickQuotePayment): { subtotal: number; hst: number; total: number } {
  const subtotal = items.reduce((s, i) => s + priceQuickQuoteItem(i).subtotal, 0);
  const hst = payment === 'cash' ? 0 : Math.round(subtotal * QUICK_QUOTE_HST_RATE * 100) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, hst, total: Math.round((subtotal + hst) * 100) / 100 };
}

export function satelliteMapUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export interface QuickQuoteMessageItem {
  label: string;
  quantity: number;
  linearFt: number;
  extraLeaks: number;
  subtotal: number;
}

export function quoteWhatsAppMessage(
  customerName: string,
  address: string,
  items: QuickQuoteMessageItem[],
  payment: QuickQuotePayment,
): string {
  const lines = items.map(i => {
    const details = [
      i.quantity > 1 ? `x${i.quantity}` : '',
      i.linearFt > 0 ? `${i.linearFt} lin ft` : '',
      i.extraLeaks > 0 ? `${i.extraLeaks} extra leak${i.extraLeaks !== 1 ? 's' : ''}` : '',
    ].filter(Boolean).join(', ');
    return `- ${i.label}${details ? ` (${details})` : ''} — $${i.subtotal.toFixed(2)}`;
  });
  const subtotal = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
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
