import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Loader2, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { deleteCustomerReview, fetchAllReviews, type CustomerReview } from '@/lib/customer-reviews';
import CustomerReviewForm from '@/components/CustomerReviewForm';

const SOURCE_LABELS = { homestars: 'HomeStars', google: 'Google' } as const;

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CustomerReviewsManager() {
  const [reviews, setReviews] = useState<CustomerReview[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CustomerReview | 'new' | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    fetchAllReviews()
      .then(setReviews)
      .catch(err => {
        console.error('Reviews load failed:', err);
        setLoadError('Could not load reviews. Please try again.');
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    setDeletingId(id);
    setActionError(null);
    try {
      await deleteCustomerReview(id);
      setConfirmingId(null);
      load();
    } catch (err) {
      console.error('Review delete failed:', err);
      setActionError('Could not delete that review. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const onSaved = () => {
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="section-title">Customer Reviews</h3>
          <button onClick={() => setEditing('new')} className="btn-primary text-xs px-3 py-2 inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add review
          </button>
        </div>
        <p className="text-xs text-navy-400">Add 5-star reviews from HomeStars or Google. Reviews marked as shown appear on the homepage.</p>
      </div>

      {actionError && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-error-400/10 border border-error-500/30 p-3 text-xs text-error-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> {actionError}
        </p>
      )}

      {reviews === null && !loadError && (
        <div className="card p-8 flex justify-center"><Loader2 className="w-6 h-6 text-gold-400 animate-spin" /></div>
      )}

      {loadError && (
        <div className="card p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-error-300">{loadError}</p>
          <button onClick={load} className="btn-ghost text-xs px-3 py-2">Retry</button>
        </div>
      )}

      {reviews?.length === 0 && (
        <div className="card p-6 text-center">
          <Star className="w-7 h-7 text-navy-600 mx-auto mb-2" />
          <p className="text-sm text-navy-300">No reviews yet. Add your first HomeStars or Google review.</p>
        </div>
      )}

      {reviews?.map(review => {
        const deleting = deletingId === review.id;
        const confirming = confirmingId === review.id;
        return (
          <article key={review.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy-50 truncate">{review.name}</p>
                <p className="text-[11px] text-navy-400 truncate">
                  {[review.location, review.reviewDate && formatDate(review.reviewDate)].filter(Boolean).join(' · ') || 'No area or date'}
                </p>
              </div>
              <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                review.active ? 'border-success-500/30 bg-success-400/10 text-success-300' : 'border-navy-600 bg-navy-800 text-navy-300'
              }`}>
                {review.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {review.active ? 'Shown' : 'Hidden'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex gap-0.5">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-gold-400 fill-gold-400" />
                ))}
              </span>
              <span className="rounded-full bg-navy-800 border border-navy-700 px-2 py-0.5 text-[10px] font-semibold text-navy-200">
                {review.source ? SOURCE_LABELS[review.source] : 'Source not set'}
              </span>
            </div>

            <p className="text-xs text-navy-200 leading-relaxed line-clamp-3">&ldquo;{review.text}&rdquo;</p>

            {confirming ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg bg-error-400/10 border border-error-500/30 p-3">
                <p className="text-xs text-error-300 flex-1">Delete this review from the website? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmingId(null)} disabled={deleting} className="btn-ghost text-xs px-3 py-2 flex-1 sm:flex-none">Keep</button>
                  <button onClick={() => remove(review.id)} disabled={deleting} className="btn-primary text-xs px-3 py-2 flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 !bg-error-500">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setEditing(review)} className="btn-secondary text-xs px-3 py-2.5 inline-flex items-center justify-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { setActionError(null); setConfirmingId(review.id); }} className="btn-ghost text-xs px-3 py-2.5 inline-flex items-center justify-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </article>
        );
      })}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-b-none md:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-navy-50">{editing === 'new' ? 'New Review' : 'Edit Review'}</h3>
              <button onClick={() => setEditing(null)} className="btn-ghost p-1.5" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <CustomerReviewForm
              initial={editing === 'new' ? null : editing}
              onSaved={onSaved}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
