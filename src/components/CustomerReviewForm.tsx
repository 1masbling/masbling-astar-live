import { useState, type FormEvent } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { saveCustomerReview, type CustomerReview, type ReviewSource } from '@/lib/customer-reviews';

interface CustomerReviewFormProps {
  initial: CustomerReview | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function CustomerReviewForm({ initial, onSaved, onCancel }: CustomerReviewFormProps) {
  const [source, setSource] = useState<ReviewSource>(initial?.source ?? 'homestars');
  const [name, setName] = useState(initial?.name ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [reviewDate, setReviewDate] = useState(initial?.reviewDate ?? '');
  const [text, setText] = useState(initial?.text ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedText = text.trim();
    if (!trimmedName) { setProblem('Please add the customer name.'); return; }
    if (!trimmedText) { setProblem('Please paste the review text.'); return; }

    setSaving(true);
    setProblem(null);
    try {
      await saveCustomerReview({
        name: trimmedName,
        location: location.trim(),
        text: trimmedText,
        source,
        reviewDate: reviewDate || null,
        active,
      }, initial?.id ?? null);
      onSaved();
    } catch (err) {
      console.error('Review save failed:', err);
      setProblem('Could not save this review. Please try again.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <p className="label mb-1.5">Where was it posted?</p>
        <div className="grid grid-cols-2 gap-2">
          {(['homestars', 'google'] as const).map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setSource(option)}
              aria-pressed={source === option}
              className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                source === option
                  ? 'border-gold-400 bg-gold-400/10 text-gold-300'
                  : 'border-navy-700 bg-navy-900 text-navy-300 hover:text-navy-100'
              }`}
            >
              {option === 'homestars' ? 'HomeStars' : 'Google'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="review-name" className="label mb-1.5 block">Customer name</label>
          <input id="review-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Maple homeowner" maxLength={80} />
        </div>
        <div>
          <label htmlFor="review-location" className="label mb-1.5 block">Area (optional)</label>
          <input id="review-location" className="input" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Maple, ON" maxLength={80} />
        </div>
      </div>

      <div>
        <label htmlFor="review-date" className="label mb-1.5 block">Date posted (optional)</label>
        <input id="review-date" type="date" className="input" value={reviewDate} onChange={e => setReviewDate(e.target.value)} />
      </div>

      <div>
        <label htmlFor="review-text" className="label mb-1.5 block">Review text</label>
        <textarea id="review-text" className="input min-h-[120px]" value={text} onChange={e => setText(e.target.value)} placeholder="Paste the customer's review exactly as written" maxLength={1000} />
      </div>

      <label className="flex items-center gap-3 rounded-xl bg-navy-900 border border-navy-700 p-3 cursor-pointer">
        <input type="checkbox" className="w-4 h-4 accent-gold-400" checked={active} onChange={e => setActive(e.target.checked)} />
        <span className="text-sm text-navy-100">Show this review on the website</span>
      </label>

      {problem && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-error-400/10 border border-error-500/30 p-3 text-xs text-error-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> {problem}
        </p>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} disabled={saving} className="btn-ghost text-sm px-4 py-2.5">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2.5 inline-flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {initial ? 'Save changes' : 'Add review'}
        </button>
      </div>
    </form>
  );
}
