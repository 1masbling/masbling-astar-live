import type { InvoicePhotoReportEntry } from './types';

export interface PhotoReportDraftItem {
  entryId: string;
  url: string;
  caption: string;
  kind: 'photo' | 'video';
}

export function draftToReportItems(items: PhotoReportDraftItem[]): InvoicePhotoReportEntry[] {
  return items.map(i => ({ url: i.url, caption: i.caption, kind: i.kind }));
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !['the', 'and', 'for', 'ltd', 'inc'].includes(t));
}

// Matches a job-photo log caption to a customer by name and/or street address
// appearing in the caption ("Smith family — Gutter Cleaning — 84 Raylawn Crescent").
export function captionMatchesCustomer(caption: string, name: string, address: string): boolean {
  if (!caption) return false;
  const tokens = tokenize(caption);
  const nameTokens = tokenize(name);
  const addressTokens = tokenize(address);
  const nameHit = nameTokens.length > 0 && nameTokens.every(t => tokens.includes(t));
  const addressHit =
    addressTokens.length > 1 &&
    addressTokens.filter(t => tokens.includes(t)).length >= Math.min(2, addressTokens.length - 1);
  return nameHit || addressHit;
}
