import { useState } from 'react';
import {
  X, Plus, Minus, MapPin, MessageCircle, CalendarPlus,
  Calculator, ExternalLink, Loader2, ArrowRight, Trash2,
} from 'lucide-react';
import { SITE_CATALOG_SERVICES } from '@/lib/site-catalog';
import {
  priceQuickQuoteItem, quickQuoteTotal, satelliteMapUrl, quoteWhatsAppMessage,
  quoteItemDetails, quickQuoteRates, waUrl, QUICK_QUOTE_HST_RATE,
  type QuickQuoteItem, type QuickQuotePayment,
} from '@/lib/quick-quote';
import { formatCurrency } from '@/lib/format';

export interface QuickQuoteTarget {
  customerName: string;
  address: string;
  phone: string;
}

interface QuickQuoteModalProps {
  target: QuickQuoteTarget;
  onClose: () => void;
  onConvertToJob: (serviceKey: string, value: number, notes: string) => Promise<void>;
}

// New customer (no profile yet): admin types a name/address inline, or
// picks an existing customer, then the full builder opens.
export function QuickQuoteModalWithCustomer({ onClose, onConvertToJob, customers }: {
  onClose: () => void;
  onConvertToJob: (customerName: string, address: string, phone: string, serviceKey: string, value: number, notes: string) => Promise<void>;
  customers: { id: string; name: string; phone: string; address: string }[];
}) {
  const [selected, setSelected] = useState<{ name: string; phone: string; address: string } | null>(null);
  const [manual, setManual] = useState({ name: '', address: '', phone: '' });
  const [started, setStarted] = useState(false);

  const target: QuickQuoteTarget = selected
    ? { customerName: selected.name, address: selected.address, phone: selected.phone }
    : { customerName: manual.name.trim(), address: manual.address.trim(), phone: manual.phone.trim() };

  if (started && target.customerName) {
    return (
      <QuickQuoteModal
        target={target}
        onClose={onClose}
        onConvertToJob={(serviceKey, value, notes) =>
          onConvertToJob(target.customerName, target.address, target.phone, serviceKey, value, notes)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="card w-full max-w-md max-h-[92vh] overflow-y-auto rounded-b-none md:rounded-2xl p-5 space-y-3 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-navy-50">Quick Quote</h3>
            <p className="text-xs text-navy-300">Pick a customer or type a new one</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <div>
          <label className="label">Existing Customer</label>
          <select
            className="input"
            value={selected ? customers.find(c => c.name === selected.name)?.id || '' : ''}
            onChange={e => {
              const c = customers.find(x => x.id === e.target.value) || null;
              setSelected(c ? { name: c.name, phone: c.phone, address: c.address } : null);
            }}
          >
            <option value="">— New / one-off customer —</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {!selected && (
          <div className="space-y-2">
            <div><label className="label">Customer Name *</label><input className="input" value={manual.name} onChange={e => setManual(m => ({ ...m, name: e.target.value }))} placeholder="John Smith" /></div>
            <div><label className="label">Address</label><input className="input" value={manual.address} onChange={e => setManual(m => ({ ...m, address: e.target.value }))} placeholder="123 Main St, Hamilton, ON" /></div>
            <div><label className="label">Phone (WhatsApp)</label><input className="input" type="tel" value={manual.phone} onChange={e => setManual(m => ({ ...m, phone: e.target.value }))} placeholder="905-555-1234" /></div>
          </div>
        )}
        <button
          disabled={!target.customerName}
          onClick={() => setStarted(true)}
          className="btn-primary w-full justify-center"
        >
          Build Quote <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface CounterRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  priceHint?: string;
}

function CounterRow({ label, value, onChange, priceHint }: CounterRowProps) {
  const canDecrement = value > 0;
  return (
    <div className="flex items-center justify-between gap-2 bg-navy-900/60 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-navy-100">{label}</p>
        {priceHint && <p className="text-[10px] text-navy-400">{priceHint}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={() => canDecrement && onChange(value - 1)} disabled={!canDecrement} className="flex items-center justify-center w-7 h-7 rounded-lg bg-navy-700 text-navy-100 disabled:opacity-30 active:scale-95 transition-all" aria-label={`Decrease ${label}`}><Minus className="w-3.5 h-3.5" /></button>
        <span className="w-10 text-center text-sm font-bold text-gold-300 tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} className="flex items-center justify-center w-7 h-7 rounded-lg bg-navy-700 text-navy-100 active:scale-95 transition-all" aria-label={`Increase ${label}`}><Plus className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function newQuoteItem(): QuickQuoteItem {
  return { serviceKey: SITE_CATALOG_SERVICES[0].key, extraUnits: 0, linearFt: 0 };
}

// Full builder: multiple services, per-service counters, custom price override.
export default function QuickQuoteModal({ target, onClose, onConvertToJob }: QuickQuoteModalProps) {
  const [items, setItems] = useState<QuickQuoteItem[]>([newQuoteItem()]);
  const [payment, setPayment] = useState<QuickQuotePayment>('cash');
  const [customPrice, setCustomPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const custom = customPrice.trim() ? parseFloat(customPrice) : NaN;
  const useCustom = Number.isFinite(custom) && custom > 0;
  const lineItems = items.map(i => ({
    item: i,
    label: SITE_CATALOG_SERVICES.find(s => s.key === i.serviceKey)?.label || i.serviceKey,
    subtotal: priceQuickQuoteItem(i),
  }));
  const totals = quickQuoteTotal(items, payment, useCustom ? custom : null);
  const primaryServiceKey = items[0].serviceKey;
  const primaryLabel = SITE_CATALOG_SERVICES.find(s => s.key === primaryServiceKey)?.label || primaryServiceKey;

  const updateItem = (idx: number, patch: Partial<QuickQuoteItem>) =>
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const sendWhatsApp = () => {
    const msg = quoteWhatsAppMessage(
      target.customerName,
      target.address || 'your property',
      lineItems.map(li => ({ label: li.label, details: quoteItemDetails(li.item), subtotal: li.subtotal })),
      payment,
      useCustom ? custom : null,
    );
    if (target.phone) {
      window.open(waUrl(target.phone, msg), '_blank', 'noopener,noreferrer');
      return;
    }
    navigator.clipboard?.writeText(msg);
  };

  const convert = async () => {
    setSaving(true);
    setError(null);
    try {
      await onConvertToJob(primaryServiceKey, totals.total, `Quick quote — ${lineItems.map(li => `${li.label}${quoteItemDetails(li.item) ? ` (${quoteItemDetails(li.item)})` : ''}`).join('; ')}. ${useCustom ? `Custom price override $${custom.toFixed(2)}` : ''} ${payment === 'cash' ? 'Cash ($0 HST)' : 'E-Transfer/Card (+13% HST)'}.`.replace(/\s+/g, ' '));
    } catch (err) {
      console.error('Convert quote to job failed:', err);
      setError('Could not create the job. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="card w-full max-w-md max-h-[92vh] overflow-y-auto rounded-b-none md:rounded-2xl p-5 space-y-3 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-navy-50 flex items-center gap-1.5"><Calculator className="w-4 h-4 text-gold-400" /> Quick Quote</h3>
            <p className="text-xs text-navy-300 truncate">{target.customerName}{target.address ? ` · ${target.address}` : ''}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => {
            const rates = quickQuoteRates(item.serviceKey);
            const label = SITE_CATALOG_SERVICES.find(s => s.key === item.serviceKey)?.label || item.serviceKey;
            return (
              <div key={idx} className="rounded-xl border border-navy-700 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <select
                    className="input text-xs flex-1"
                    value={item.serviceKey}
                    onChange={e => updateItem(idx, { serviceKey: e.target.value, extraUnits: 0, linearFt: 0 })}
                  >
                    {SITE_CATALOG_SERVICES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                  {items.length > 1 && (
                    <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} className="btn-ghost p-1.5 text-navy-400 hover:text-error-400" aria-label="Remove service">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-navy-400">
                  Base {formatCurrency(rates.base)}
                  {rates.extraUnitLabel ? ` · +${formatCurrency(rates.extraUnitCost)} per extra ${rates.extraUnitLabel.toLowerCase().replace(/s$/, '')}` : ''}
                  {rates.usesLinearFt ? ` · ${formatCurrency(rates.linearFtBlockCost)} per ${rates.linearFtBlock} lin ft (min ${formatCurrency(rates.linearFtBlockCost)})` : ''}
                </p>
                {rates.extraUnitLabel && (
                  <CounterRow label={rates.extraUnitLabel} value={item.extraUnits} onChange={v => updateItem(idx, { extraUnits: v })} priceHint={`+${formatCurrency(rates.extraUnitCost)} each`} />
                )}
                {rates.usesLinearFt && (
                  <div>
                    <label className="label">Linear Feet</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={item.linearFt || ''}
                      onChange={e => updateItem(idx, { linearFt: Math.max(0, parseInt(e.target.value) || 0) })}
                      placeholder="e.g. 60"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-navy-300">{label}</span>
                  <span className="font-semibold text-navy-100">{formatCurrency(priceQuickQuoteItem(item))}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={() => setItems(prev => [...prev, newQuoteItem()])} className="btn-secondary w-full justify-center text-xs">
          <Plus className="w-4 h-4" /> + Add Another Service
        </button>

        <div>
          <label className="label">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPayment('cash')} className={`rounded-xl px-3 py-2.5 text-xs font-semibold border transition-all ${payment === 'cash' ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>
              Cash
              <span className="block text-[10px] font-normal opacity-80">$0 HST</span>
            </button>
            <button type="button" onClick={() => setPayment('card')} className={`rounded-xl px-3 py-2.5 text-xs font-semibold border transition-all ${payment === 'card' ? 'bg-gold-400 text-navy-950 border-gold-400' : 'bg-navy-900 text-navy-300 border-navy-700 hover:border-navy-600'}`}>
              E-Transfer / Card
              <span className="block text-[10px] font-normal opacity-80">+13% HST</span>
            </button>
          </div>
        </div>

        <div>
          <label className="label">Custom Price Override (optional)</label>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            value={customPrice}
            onChange={e => setCustomPrice(e.target.value)}
            placeholder={`Override total — e.g. for 2-storey / 3-storey jobs`}
          />
          <p className="text-[10px] text-navy-500 mt-1">Leave empty to use the calculated total. When set, this amount replaces the subtotal before HST.</p>
        </div>

        <div className="rounded-xl border border-navy-700 divide-y divide-navy-700">
          {lineItems.map((li, idx) => (
            <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
              <span className="text-navy-300">{li.label}{quoteItemDetails(li.item) ? ` (${quoteItemDetails(li.item)})` : ''}</span>
              <span className="font-semibold text-navy-100">{formatCurrency(li.subtotal)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2 text-xs">
            <span className="text-navy-300">HST (13%){payment === 'cash' ? ' — waived for cash' : ''}</span>
            <span className="font-semibold text-navy-100">{formatCurrency(totals.hst)}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-navy-200 font-semibold">Total</span>
            <span className="text-lg font-bold text-gold-400 font-display">{formatCurrency(totals.total)}</span>
          </div>
        </div>

        {target.address && (
          <a
            href={satelliteMapUrl(target.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-navy-800 hover:bg-navy-700 px-3 py-2.5 text-xs font-semibold text-navy-100 transition-colors"
          >
            <MapPin className="w-4 h-4 text-gold-400" /> Open Satellite Map <ExternalLink className="w-3 h-3 text-navy-400" />
          </a>
        )}

        {error && <p className="text-xs text-error-400">{error}</p>}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={sendWhatsApp} className="btn-secondary justify-center text-xs" title={target.phone ? 'Open WhatsApp with the itemized quote' : 'No phone on file — copies the quote to your clipboard'}>
            <MessageCircle className="w-4 h-4" /> Send via WhatsApp
          </button>
          <button onClick={convert} disabled={saving} className="btn-primary justify-center text-xs">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />} {saving ? 'Creating...' : 'Convert to Job'}
          </button>
        </div>
        <p className="text-[10px] text-navy-500 text-center">Convert adds a scheduled job to this customer at {formatCurrency(totals.total)} ({QUICK_QUOTE_HST_RATE * 100}% HST only on card/e-Transfer) and appears on the Dispatch calendar.</p>
      </div>
    </div>
  );
}
