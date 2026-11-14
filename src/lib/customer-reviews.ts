import { supabase } from './supabase';

export const HOMESTARS_PROFILE_URL = 'https://www.homestars.com/profile/masbling-astar-services';
export const GOOGLE_REVIEW_URL = 'https://g.page/r/CU5FcHh35s78EBM/review';
export const VERIFIED_RATING = 4.9;
export const VERIFIED_REVIEW_COUNT = 13;

export type ReviewSource = 'homestars' | 'google';

export interface CustomerReview {
  id: string;
  name: string;
  location: string;
  text: string;
  rating: number;
  source: ReviewSource | null;
  reviewDate: string | null;
  active: boolean;
}

export interface CustomerReviewInput {
  name: string;
  location: string;
  text: string;
  source: ReviewSource;
  reviewDate: string | null;
  active: boolean;
}

const REVIEW_COLUMNS = 'id, name, location, text, rating, source, review_date, active';

function toReview(row: unknown): CustomerReview | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Record<string, unknown>;
  if (
    typeof r.id !== 'string' ||
    typeof r.name !== 'string' ||
    typeof r.text !== 'string' ||
    typeof r.rating !== 'number' ||
    typeof r.active !== 'boolean'
  ) {
    return null;
  }
  return {
    id: r.id,
    name: r.name,
    location: typeof r.location === 'string' ? r.location : '',
    text: r.text,
    rating: r.rating,
    source: r.source === 'homestars' || r.source === 'google' ? r.source : null,
    reviewDate: typeof r.review_date === 'string' ? r.review_date : null,
    active: r.active,
  };
}

function parseReviews(data: unknown): CustomerReview[] {
  if (!Array.isArray(data)) throw new Error('Reviews response was not a list');
  return data.flatMap(row => {
    const review = toReview(row);
    return review ? [review] : [];
  });
}

export async function fetchPublicReviews(): Promise<CustomerReview[]> {
  const { data, error } = await supabase
    .from('website_testimonials')
    .select(REVIEW_COLUMNS)
    .eq('active', true)
    .order('review_date', { ascending: false, nullsFirst: false })
    .order('display_order', { ascending: true });
  if (error) throw error;
  return parseReviews(data);
}

export async function fetchAllReviews(): Promise<CustomerReview[]> {
  const { data, error } = await supabase
    .from('website_testimonials')
    .select(REVIEW_COLUMNS)
    .order('review_date', { ascending: false, nullsFirst: false })
    .order('display_order', { ascending: true });
  if (error) throw error;
  return parseReviews(data);
}

export async function saveCustomerReview(input: CustomerReviewInput, id: string | null): Promise<void> {
  const payload = {
    name: input.name,
    location: input.location,
    text: input.text,
    rating: 5,
    source: input.source,
    review_date: input.reviewDate,
    active: input.active,
  };
  const { error } = id
    ? await supabase.from('website_testimonials').update(payload).eq('id', id)
    : await supabase.from('website_testimonials').insert(payload);
  if (error) throw error;
}

export async function deleteCustomerReview(id: string): Promise<void> {
  const { error } = await supabase.from('website_testimonials').delete().eq('id', id);
  if (error) throw error;
}
