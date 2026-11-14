import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Loader2, MapPin, Quote, Star } from 'lucide-react';
import {
  GOOGLE_REVIEW_URL,
  HOMESTARS_PROFILE_URL,
  VERIFIED_RATING,
  VERIFIED_REVIEW_COUNT,
  fetchPublicReviews,
  type CustomerReview,
  type ReviewSource,
} from '@/lib/customer-reviews';

const SOURCE_LABELS: Record<ReviewSource, string> = {
  homestars: 'HomeStars',
  google: 'Google',
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; reviews: CustomerReview[] };

function RatingStars({ value, label }: { value: number; label: string }) {
  const fillPercent = Math.min(100, Math.max(0, (value / 5) * 100));
  return (
    <div className="relative inline-flex" role="img" aria-label={`${label} out of 5 stars`}>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-4 h-4 text-navy-600" />
        ))}
      </div>
      <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
        <div className="flex gap-0.5 w-max">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-4 h-4 text-gold-400 fill-gold-400" />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatReviewDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function ReviewCard({ review }: { review: CustomerReview }) {
  const sourceLabel = review.source ? SOURCE_LABELS[review.source] : null;
  return (
    <article className="card card-hover p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <Quote className="w-7 h-7 text-gold-400/30" aria-hidden="true" />
        {sourceLabel && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-400/10 border border-success-500/30 px-2 py-0.5">
            <BadgeCheck className="w-3 h-3 text-success-400" aria-hidden="true" />
            <span className="text-[10px] font-semibold text-success-300">Verified on {sourceLabel}</span>
          </span>
        )}
      </div>
      <RatingStars value={review.rating} label={`${review.rating}`} />
      <p className="text-sm text-navy-200 leading-relaxed mt-3 mb-4 flex-1">&ldquo;{review.text}&rdquo;</p>
      <div className="flex items-center gap-2.5 pt-3 border-t border-navy-800/50">
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-navy-700 text-gold-400 font-display font-bold text-sm shrink-0">
          {initialsOf(review.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-50 truncate">{review.name}</p>
          <p className="text-[11px] text-navy-400 flex items-center gap-1 flex-wrap">
            {review.location && (
              <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />{review.location}</span>
            )}
            {review.reviewDate && <span>&middot; {formatReviewDate(review.reviewDate)}</span>}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function CustomerReviews({ intro }: { intro: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetchPublicReviews()
      .then(reviews => { if (!cancelled) setState({ status: 'ready', reviews }); })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => { cancelled = true; };
  }, []);

  return (
    <section id="testimonials" className="py-14 sm:py-20 px-4 sm:px-6 bg-navy-900/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-gold-400 mb-2">Verified Customer Reviews</p>
          <h2 className="font-display text-2xl sm:text-4xl font-bold text-white mb-3">What Our Customers Say</h2>
          <p className="text-sm text-navy-300 max-w-xl mx-auto">
            {intro || 'Real reviews from real homeowners across the GTA. See why families trust us for their gutter and exterior maintenance.'}
          </p>

          <div className="inline-flex flex-wrap items-center justify-center gap-3 mt-6 rounded-2xl bg-navy-800/80 border border-gold-600/20 px-5 py-3">
            <span className="font-display text-3xl font-bold text-white leading-none">{VERIFIED_RATING.toFixed(1)}</span>
            <div className="text-left">
              <RatingStars value={VERIFIED_RATING} label={VERIFIED_RATING.toFixed(1)} />
              <p className="text-xs text-navy-300 mt-1">Verified Rating &middot; {VERIFIED_REVIEW_COUNT} reviews</p>
            </div>
          </div>
        </div>

        {state.status === 'loading' && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-gold-400 animate-spin" aria-label="Loading reviews" />
          </div>
        )}

        {state.status === 'error' && (
          <p className="text-sm text-navy-300 text-center py-6">Reviews are unavailable right now. Please check back soon.</p>
        )}

        {state.status === 'ready' && state.reviews.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {state.reviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-8 sm:mt-10">
          <a
            href={HOMESTARS_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold"
          >
            Read All {VERIFIED_REVIEW_COUNT} Reviews on HomeStars
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
          <a
            href={GOOGLE_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold"
          >
            <Star className="w-4 h-4" aria-hidden="true" />
            Leave Us a Google Review
          </a>
        </div>
      </div>
    </section>
  );
}
