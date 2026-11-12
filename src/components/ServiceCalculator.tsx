import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Calculator, Check, Loader2, Send } from 'lucide-react';
import { ONTARIO_TAX_RATE } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { submitCalculatorQuote, type CalculatorQuoteResult } from '@/lib/calculator-quote';
import ProjectMediaUpload from '@/components/ProjectMediaUpload';

const GUTTER_TIERS = [
  { key: 'bungalow', label: 'One-Story Bungalow', price: 190 },
  { key: 'two-story', label: 'Two-Story House', price: 220 },
] as const;

const WINDOW_CAULKING_PRICE = 250;

type GutterTierKey = (typeof GUTTER_TIERS)[number]['key'];

export default function ServiceCalculator() {
  const [gutterChecked, setGutterChecked] = useState(false);
  const [gutterTier, setGutterTier] = useState<GutterTierKey>('bungalow');
  const [caulkingChecked, setCaulkingChecked] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quote, setQuote] = useState<CalculatorQuoteResult | null>(null);

  const lines = useMemo(() => {
    const items: { label: string; price: number }[] = [];
    if (gutterChecked) {
      const tier = GUTTER_TIERS.find(t => t.key === gutterTier) ?? GUTTER_TIERS[0];
      items.push({ label: `Gutter Cleaning (${tier.label})`, price: tier.price });
    }
    if (caulkingChecked) items.push({ label: 'Window Caulking', price: WINDOW_CAULKING_PRICE });
    return items;
  }, [gutterChecked, gutterTier, caulkingChecked]);

  const subtotal = lines.reduce((sum, line) => sum + line.price, 0);
  const tax = subtotal * ONTARIO_TAX_RATE;
  const total = subtotal + tax;
  const hasSelection = lines.length > 0;

  const serviceKeys = [
    ...(gutterChecked ? [`gutter-${gutterTier}`] : []),
    ...(caulkingChecked ? ['window-caulking'] : []),
  ];
  const selectionSignature = serviceKeys.join('|');

  useEffect(() => {
    setQuote(null);
    setSubmitError(null);
  }, [selectionSignature, files]);

  const handleSubmit = async () => {
    if (!hasSelection || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      setQuote(await submitCalculatorQuote(serviceKeys, files));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save your quote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <section id="calculator" className="py-14 sm:py-20 px-4 sm:px-6">

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-400/10 border border-gold-600/30 px-3 py-1.5 mb-3">
            <Calculator className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-xs font-medium text-gold-300">Instant Estimate</span>
          </div>
          <h2 className="font-display text-2xl sm:text-4xl font-bold text-white mb-3">Price Your Service</h2>
          <p className="text-sm text-navy-300 max-w-xl mx-auto">
            Choose the services you need to see an estimated price. Final pricing is confirmed when you book.
          </p>
        </div>

        <div className="card p-5 sm:p-6 space-y-5">
          <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-4 sm:p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={gutterChecked}
                onChange={e => setGutterChecked(e.target.checked)}
                disabled={submitting}
                className="mt-1 h-4 w-4 accent-gold-400"
              />
              <span className="flex-1">
                <span className="block font-display text-sm font-bold text-navy-50">Gutter Cleaning</span>
                <span className="block text-xs text-navy-300 mt-0.5">
                  Debris removal and downpipe flushing to keep water flowing freely.
                </span>
              </span>
            </label>
            {gutterChecked && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GUTTER_TIERS.map(tier => (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => setGutterTier(tier.key)}
                    aria-pressed={gutterTier === tier.key}
                    disabled={submitting}
                    className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                      gutterTier === tier.key
                        ? 'bg-gold-400 border-gold-400 text-navy-950'
                        : 'bg-navy-900 border-navy-700 text-navy-200 hover:border-gold-600'
                    }`}
                  >
                    {tier.label} - {formatCurrency(tier.price)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-4 sm:p-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={caulkingChecked}
                onChange={e => setCaulkingChecked(e.target.checked)}
                disabled={submitting}
                className="mt-1 h-4 w-4 accent-gold-400"
              />
              <span className="flex-1">
                <span className="block font-display text-sm font-bold text-navy-50">
                  Window Caulking - {formatCurrency(WINDOW_CAULKING_PRICE)}
                </span>
                <span className="block text-xs text-navy-300 mt-0.5">
                  Remove old caulk and apply premium sealant to stop drafts and water intrusion.
                </span>
              </span>
            </label>
          </div>

          <ProjectMediaUpload files={files} onFilesChange={setFiles} disabled={submitting} />

          <div className="rounded-xl border border-navy-800 bg-navy-950/60 p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-navy-300 mb-3">Pricing Summary</p>
            {hasSelection ? (
              <ul className="space-y-2 mb-4">
                {lines.map(line => (
                  <li key={line.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-navy-100">
                      <Check className="w-3.5 h-3.5 text-success-400 shrink-0" />
                      {line.label}
                    </span>
                    <span className="text-navy-100 font-semibold">{formatCurrency(line.price)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-navy-300 mb-4">Select a service above to see your estimate.</p>
            )}
            <div className="border-t border-navy-800 pt-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-navy-300">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-navy-300">
                <span>HST (13%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex items-center justify-between font-display text-base font-bold text-navy-50 pt-1">
                <span>Estimated Total</span>
                <span className="text-gold-400">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div id="calculator-quote" className="space-y-3 scroll-mt-24">
            {quote ? (
              <div className="rounded-xl border border-success-700/50 bg-success-900/20 p-5 space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 text-success-300">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="font-display text-sm font-bold">Your quote has been received</p>
                </div>
                <p className="text-xs text-navy-200">
                  Saved subtotal {formatCurrency(quote.subtotal)}, HST {formatCurrency(quote.hstAmount)}, total{' '}
                  <span className="font-semibold text-navy-50">{formatCurrency(quote.total)}</span>. We will contact you to confirm your booking.
                </p>
                <p className="text-[11px] text-navy-400">Reference {quote.id.slice(0, 8).toUpperCase()}</p>
              </div>
            ) : (
              <>
                {submitError && (
                  <div className="flex items-center gap-2 text-xs text-error-300 bg-error-900/20 border border-error-700/50 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!hasSelection || submitting}
                  className={`btn-primary w-full justify-center text-sm px-6 py-3.5 transition-opacity ${
                    hasSelection && !submitting ? '' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending your quote...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Submit My Quote</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
    {hasSelection && !quote && (
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-navy-800 bg-navy-950/95 backdrop-blur-md px-4 py-3 animate-fade-in">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-navy-300">Estimated total</p>
            <p className="font-display text-base font-bold text-gold-400">{formatCurrency(total)}</p>
          </div>
          <a href="#calculator-quote" className="btn-primary text-sm px-5 py-3 shrink-0">
            Submit Your Quote <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    )}
    </>
  );
}
