import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Images, Loader2, RotateCcw } from 'lucide-react';
import { COMPANY } from '@/lib/constants';
import { fetchPublicJobGallery, type PublicJobGalleryItem } from '@/lib/job-gallery';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: PublicJobGalleryItem[] };

function formatCompletedOn(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
}

export default function ProjectGallery() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [activeService, setActiveService] = useState<string>('All');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPublicJobGallery()
      .then(items => { if (!cancelled) setState({ status: 'ready', items }); })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt(n => n + 1);
  };

  const services = useMemo(() => {
    if (state.status !== 'ready') return [];
    return Array.from(new Set(state.items.map(item => item.serviceLabel))).sort();
  }, [state]);

  const visibleItems = useMemo(() => {
    if (state.status !== 'ready') return [];
    return activeService === 'All'
      ? state.items
      : state.items.filter(item => item.serviceLabel === activeService);
  }, [state, activeService]);

  return (
    <div className="pb-8">
      <header className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-gold-400/10 border border-gold-600/30 px-3 py-1.5 mb-3">
          <Images className="w-3.5 h-3.5 text-gold-400" />
          <span className="text-xs font-medium text-gold-300">Project Gallery</span>
        </div>
        <h1 className="font-display text-2xl sm:text-4xl font-bold text-white mb-3">Completed Work</h1>
        <p className="text-sm text-navy-300 max-w-xl mx-auto leading-relaxed">
          Drag any slider to compare the property before and after our crew's work. Every photo is watermarked.
        </p>
      </header>

      {state.status === 'loading' && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-navy-300">
          <Loader2 className="w-7 h-7 text-gold-400 animate-spin" />
          <p className="text-sm">Loading completed projects...</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="mx-auto max-w-md rounded-2xl border border-error-700/40 bg-navy-900 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-error-400 mx-auto mb-3" />
          <p className="text-sm text-navy-100 mb-4">We could not load the gallery right now.</p>
          <button
            onClick={retry}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-800 hover:bg-navy-700 px-4 py-2 text-xs font-semibold text-gold-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && state.items.length === 0 && (
        <div className="mx-auto max-w-md rounded-2xl border border-navy-800 bg-navy-900 p-6 text-center">
          <Images className="w-8 h-8 text-navy-400 mx-auto mb-3" />
          <p className="text-sm text-navy-200">Our completed project photos will appear here soon.</p>
        </div>
      )}

      {state.status === 'ready' && state.items.length > 0 && (
        <>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {['All', ...services].map(service => (
              <button
                key={service}
                onClick={() => setActiveService(service)}
                aria-pressed={activeService === service}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition-colors ${
                  activeService === service
                    ? 'bg-gold-400 border-gold-400 text-navy-950'
                    : 'bg-navy-900 border-navy-700 text-navy-200 hover:border-gold-600 hover:text-gold-300'
                }`}
              >
                {service}
              </button>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {visibleItems.map(item => {
              const completed = formatCompletedOn(item.completedOn);
              return (
                <article key={item.jobId} className="card p-3 sm:p-4">
                  <BeforeAfterSlider
                    beforeImage={item.beforeUrl}
                    afterImage={item.afterUrl}
                    logoUrl={COMPANY.logoUrl}
                  />
                  <div className="flex items-center justify-between gap-3 px-1 pt-3">
                    <h2 className="font-display text-sm font-bold text-navy-50">{item.serviceLabel}</h2>
                    {completed && <span className="text-xs text-navy-300">{completed}</span>}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
