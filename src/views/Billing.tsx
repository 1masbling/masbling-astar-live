import { useState, useMemo, useEffect, useSyncExternalStore } from 'react';
import {
  Send, CreditCard, Plus, X, Mail, DollarSign, CheckCircle2,
  Clock, AlertCircle, FileText, Banknote, Smartphone,
  Copy, Check, Building2, ExternalLink, ShoppingBag, Printer, MessageCircle,
} from 'lucide-react';
import { useData } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, formatShortDate, serviceDisplayName } from '@/lib/format';
import { INVOICE_STATUSES, COMPANY } from '@/lib/constants';
import { InvoiceStatusBadge } from '@/components/StatusBadges';
import { exportInvoicesCsv } from '@/lib/export';
import { getJobPhotoLog, subscribeToJobPhotoLog } from '@/lib/job-photo-log';
import { captionMatchesCustomer, draftToReportItems, type PhotoReportDraftItem } from '@/lib/photo-report';
import { invoiceWhatsAppMessage, reviewRequestMessage, whatsappUrl } from '@/lib/road-links';
import { LOGO_SRC } from '@/lib/watermark';
import type { Invoice, InvoiceStatus, Payment, PaymentMethod, InvoicePhotoReportEntry } from '@/lib/types';

const LOGO_URL = COMPANY.logoUrl;

function useEtransferSettings() {
  const [etransferEmail, setEtransferEmail] = useState(COMPANY.etransferEmail);
  const [etransferRecipient, setEtransferRecipient] = useState(COMPANY.etransferRecipient);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('company_settings')
      .select('etransfer_email, etransfer_recipient')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const saved = data as { etransfer_email: string | null; etransfer_recipient: string | null };
        if (saved.etransfer_email) setEtransferEmail(saved.etransfer_email);
        if (saved.etransfer_recipient) setEtransferRecipient(saved.etransfer_recipient);
      });
    return () => { cancelled = true; };
  }, []);

  return { etransferEmail, etransferRecipient };
}

function InvoiceLetterhead({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const logoClass = size === 'sm' ? 'w-9 h-9' : 'w-16 h-16 md:w-20 md:h-20';
  const nameClass = size === 'sm' ? 'text-sm' : 'text-base md:text-xl';
  const metaClass = size === 'sm' ? 'text-[11px]' : 'text-xs md:text-sm';
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3">
      <img src={LOGO_URL} alt="Masbling Astar Services logo" className={`${logoClass} object-contain shrink-0`} />
      <div className="min-w-0">
        <p className={`font-display font-bold text-navy-900 tracking-tight leading-tight ${nameClass}`}>{COMPANY.name}</p>
        <p className={`${metaClass} text-navy-600 mt-0.5`}>{COMPANY.email} · {COMPANY.phone}</p>
      </div>
    </div>
  );
}

type Tab = 'invoices' | 'payments' | 'etransfer' | 'square';

export default function Billing() {
  const [tab, setTab] = useState<Tab>('invoices');
  const { invoices, payments } = useData();

  const tabs: { key: Tab; label: string; icon: typeof Send }[] = [
    { key: 'invoices', label: 'Invoices', icon: Send },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'etransfer', label: 'e-Transfer', icon: Smartphone },
    { key: 'square', label: 'Square', icon: ShoppingBag },
  ];

  const totals = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
    const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);
    const etransferPending = payments.filter(p => p.method === 'etransfer' && p.status === 'pending').reduce((s, p) => s + p.amount, 0);
    return { paid, outstanding, overdue, etransferPending };
  }, [invoices, payments]);

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-navy-50 font-display">Billing</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="card p-3"><div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-4 h-4 text-success-400" /><span className="text-xs text-navy-300">Paid</span></div><p className="text-base font-bold text-success-300 font-display">{formatCurrency(totals.paid)}</p></div>
        <div className="card p-3"><div className="flex items-center gap-1.5 mb-1"><Clock className="w-4 h-4 text-gold-400" /><span className="text-xs text-navy-300">Outstanding</span></div><p className="text-base font-bold text-gold-300 font-display">{formatCurrency(totals.outstanding)}</p></div>
        <div className="card p-3"><div className="flex items-center gap-1.5 mb-1"><AlertCircle className="w-4 h-4 text-error-400" /><span className="text-xs text-navy-300">Overdue</span></div><p className="text-base font-bold text-error-300 font-display">{formatCurrency(totals.overdue)}</p></div>
        <div className="card p-3"><div className="flex items-center gap-1.5 mb-1"><Smartphone className="w-4 h-4 text-teal-400" /><span className="text-xs text-navy-300">e-Transfer Pending</span></div><p className="text-base font-bold text-teal-300 font-display">{formatCurrency(totals.etransferPending)}</p></div>
      </div>
      <div className="flex items-center gap-1.5">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${tab === t.key ? 'bg-gold-400 text-navy-950' : 'bg-navy-800 text-navy-300 hover:bg-navy-700'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'invoices' && <InvoicesPanel invoices={invoices} />}
      {tab === 'payments' && <PaymentsPanel invoices={invoices} />}
      {tab === 'etransfer' && <EtransferPanel invoices={invoices} />}
      {tab === 'square' && <SquarePanel invoices={invoices} />}
    </div>
  );
}

function InvoicesPanel({ invoices }: { invoices: Invoice[] }) {
  const { jobs, customers, updateInvoiceStatus, addInvoice } = useData();
  const [showAdd, setShowAdd] = useState(false);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
  const [copied, setCopied] = useState<string | null>(null);
  const filtered = invoices.filter(i => filter === 'all' || i.status === filter);
  const jobFor = (jobId: string | null) => jobs.find(j => j.id === jobId);

  const phoneFor = (inv: Invoice) =>
    customers.find(c => c.id === inv.customer_id || c.name.trim().toLowerCase() === inv.customer_name.trim().toLowerCase())?.phone || '';

  const sendOrCopy = (inv: Invoice, message: string) => {
    const phone = phoneFor(inv);
    if (phone) {
      window.open(whatsappUrl(phone, message), '_blank', 'noopener,noreferrer');
      return;
    }
    navigator.clipboard?.writeText(message).then(() => {
      setCopied(inv.id);
      setTimeout(() => setCopied(c => (c === inv.id ? null : c)), 2500);
    });
  };

  const handleWhatsAppInvoice = (inv: Invoice) => {
    const job = jobFor(inv.job_id);
    sendOrCopy(inv, invoiceWhatsAppMessage(inv.customer_name, inv.number, job ? serviceDisplayName(job.service_key) : '', formatCurrency(inv.amount)));
  };

  const handleReviewRequest = (inv: Invoice) => {
    sendOrCopy(inv, reviewRequestMessage(inv.customer_name));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setFilter('all')} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${filter === 'all' ? 'bg-navy-600 text-navy-50' : 'bg-navy-800 text-navy-300'}`}>All ({invoices.length})</button>
          {INVOICE_STATUSES.map(s => {
            const count = invoices.filter(i => i.status === s.key).length;
            return <button key={s.key} onClick={() => setFilter(s.key)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all ${filter === s.key ? `${s.bg} ${s.color}` : 'bg-navy-800 text-navy-300'}`}>{s.label} ({count})</button>;
          })}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportInvoicesCsv(invoices)} className="btn-ghost text-xs">Export</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-xs py-2"><Plus className="w-3.5 h-3.5" /> New Invoice</button>
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map(inv => {
          const job = jobFor(inv.job_id);
          return (
            <div key={inv.id} className="card card-hover p-3 cursor-pointer" onClick={() => setPreview(inv)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white shrink-0 p-1">
                    <img src={LOGO_URL} alt="Masbling Astar Services logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0"><p className="text-sm font-semibold text-navy-50">{inv.number}</p><p className="text-xs text-navy-300 truncate">{inv.customer_name}{job ? ` · ${serviceDisplayName(job.service_key)}` : ''}</p></div>
                </div>
                <InvoiceStatusBadge status={inv.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gold-400">{formatCurrency(inv.amount)}</span>
                <div className="flex items-center gap-2 text-xs text-navy-300">
                  {inv.sent_at && <span className="inline-flex items-center gap-1"><Send className="w-3 h-3" /> {formatDate(inv.sent_at)}</span>}
                  {inv.paid_at && <span className="inline-flex items-center gap-1 text-success-400"><CheckCircle2 className="w-3 h-3" /> {formatDate(inv.paid_at)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-navy-700" onClick={e => e.stopPropagation()}>
                {inv.status === 'draft' && <button onClick={() => updateInvoiceStatus(inv.id, 'sent')} className="btn-secondary text-xs py-1.5 px-3"><Send className="w-3 h-3" /> Mark Sent</button>}
                {(inv.status === 'sent' || inv.status === 'overdue') && <button onClick={() => updateInvoiceStatus(inv.id, 'paid')} className="btn-primary text-xs py-1.5 px-3"><CheckCircle2 className="w-3 h-3" /> Mark Paid</button>}
                {(inv.status === 'draft' || inv.status === 'sent' || inv.status === 'overdue') && (
                  <button onClick={() => handleWhatsAppInvoice(inv)} className="btn-secondary text-xs py-1.5 px-3" title={phoneFor(inv) ? 'Open WhatsApp with the invoice details' : 'No phone on file — copies the message to your clipboard'}>
                    <MessageCircle className="w-3 h-3" /> {copied === inv.id ? 'Copied!' : 'Send via WhatsApp'}
                  </button>
                )}
                {inv.status === 'paid' && (
                  <button onClick={() => handleReviewRequest(inv)} className="btn-secondary text-xs py-1.5 px-3" title={phoneFor(inv) ? 'Open WhatsApp with a review request' : 'No phone on file — copies the message to your clipboard'}>
                    <MessageCircle className="w-3 h-3" /> {copied === inv.id ? 'Copied!' : 'Request Review'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="card p-8 text-center"><FileText className="w-8 h-8 text-navy-600 mx-auto mb-2" /><p className="text-sm text-navy-300">No invoices in this view.</p></div>}
      </div>
      {showAdd && <AddInvoiceModal jobs={jobs} nextNumber={`INV-2026-${String(invoices.length + 1).padStart(3, '0')}`} onClose={() => setShowAdd(false)} onAdd={async (inv) => { await addInvoice(inv); setShowAdd(false); }} />}      {preview && <InvoicePreviewModal invoice={preview} job={jobFor(preview.job_id)} onClose={() => setPreview(null)} onMarkSent={async () => { await updateInvoiceStatus(preview.id, 'sent'); }} onMarkPaid={async () => { await updateInvoiceStatus(preview.id, 'paid'); }} />}
    </div>
  );
}

function useJobPhotoLogEntries() {
  return useSyncExternalStore(subscribeToJobPhotoLog, getJobPhotoLog);
}

function InvoicePreviewModal({ invoice, job, onClose, onMarkSent, onMarkPaid }: {
  invoice: Invoice;
  job?: { id: string; service_key: string; status: string; value: number; scheduled_date: string | null };
  onClose: () => void;
  onMarkSent: () => Promise<void>;
  onMarkPaid: () => Promise<void>;
}) {
  const photoReport: InvoicePhotoReportEntry[] = Array.isArray(invoice.photo_report) ? invoice.photo_report : [];
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <style>{`@media print { body * { visibility: hidden; } .invoice-print-area, .invoice-print-area * { visibility: visible; } .invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
      <div className="card w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-b-none md:rounded-2xl p-5 space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between print:hidden">
          <h3 className="text-base font-bold text-navy-50">Invoice Preview</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="invoice-print-area space-y-4">
          <InvoiceLetterhead />

          <div className="bg-navy-900/60 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-navy-400">Invoice</p>
              <p className="text-sm font-bold text-navy-50">{invoice.number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-navy-400">Billed To</p>
              <p className="text-sm font-semibold text-navy-50">{invoice.customer_name}</p>
            </div>
          </div>

          <div className="rounded-xl border border-navy-700 divide-y divide-navy-700">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-navy-300">{job ? `Service — ${serviceDisplayName(job.service_key)}` : 'Service'}</span>
              <span className="font-semibold text-navy-100">{formatCurrency(invoice.amount)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-navy-300">Status</span>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-navy-300">Sent</span>
              <span className="text-navy-100">{invoice.sent_at ? formatDate(invoice.sent_at) : '—'}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-navy-300 font-semibold">Total Due</span>
              <span className="text-lg font-bold text-gold-400 font-display">{formatCurrency(invoice.amount)}</span>
            </div>
          </div>

          <p className="text-xs text-navy-400 text-center">Payment by e-Transfer to {COMPANY.etransferEmail} · Questions? {COMPANY.email} · {COMPANY.phone}</p>

          {photoReport.length > 0 && (
            <div className="rounded-xl border border-navy-700 p-4 space-y-3">
              <div>
                <p className="text-sm font-bold text-navy-900 font-display">Job Site Photo Report</p>
                <p className="text-xs text-navy-500">Before & After documentation — {COMPANY.name}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photoReport.map((item, i) => (
                  <div key={`${item.url}-${i}`} className="space-y-1">
                    <div className="relative rounded-lg overflow-hidden bg-navy-900 aspect-square">
                      {item.kind === 'video' ? (
                        <>
                          <video src={item.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                          <img src={LOGO_SRC} alt="Masbling Astar Services logo" className="pointer-events-none absolute top-1 right-1 h-6 w-6 rounded-full bg-navy-950/70 object-contain p-0.5" />
                        </>
                      ) : (
                        <img src={item.url} alt={item.caption || `Job site photo ${i + 1}`} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <p className="text-[10px] text-center text-navy-300 truncate">{item.caption || `Photo ${i + 1}`}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 print:hidden" onClick={e => e.stopPropagation()}>
          {invoice.status === 'draft' && <button onClick={onMarkSent} className="btn-secondary flex-1"><Send className="w-4 h-4" /> Mark Sent</button>}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && <button onClick={onMarkPaid} className="btn-primary flex-1"><CheckCircle2 className="w-4 h-4" /> Mark Paid</button>}
          <button onClick={() => window.print()} className="btn-secondary flex-1"><Printer className="w-4 h-4" /> Print / PDF</button>
        </div>
      </div>
    </div>
  );
}

function AddInvoiceModal({ jobs, nextNumber, onClose, onAdd }: {
  jobs: { id: string; customer_name: string }[];
  nextNumber: string;
  onClose: () => void;
  onAdd: (inv: Omit<Invoice, 'id' | 'created_at'>) => Promise<void>;
}) {
  const logPhotos = useJobPhotoLogEntries();
  const [form, setForm] = useState({ job_id: '', customer_name: '', amount: '' });
  const [reportItems, setReportItems] = useState<PhotoReportDraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableMedia = form.customer_name.trim()
    ? logPhotos.filter(p => captionMatchesCustomer(p.caption, form.customer_name, ''))
    : logPhotos;

  const toggleReportItem = (p: (typeof logPhotos)[number]) => {
    setReportItems(prev => {
      if (prev.some(i => i.entryId === p.id)) return prev.filter(i => i.entryId !== p.id);
      if (prev.length >= 6) return prev;
      return [...prev, { entryId: p.id, url: p.photo_url || p.localUrl, caption: p.phase || '', kind: p.kind || 'photo' }];
    });
  };

  const setReportCaption = (entryId: string, caption: string) => {
    setReportItems(prev => prev.map(i => (i.entryId === entryId ? { ...i, caption } : i)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.amount) { setError('Customer name and amount are required'); return; }
    if (reportItems.length > 0 && reportItems.length < 2) { setError('Attach at least 2 photos for the Job Site Photo Report (or none at all)'); return; }
    setSaving(true);
    setError(null);
    try {
      await onAdd({
        number: nextNumber,
        job_id: form.job_id || null,
        customer_id: null,
        customer_name: form.customer_name.trim(),
        amount: parseFloat(form.amount) || 0,
        status: 'draft',
        sent_at: null,
        paid_at: null,
        photo_report: reportItems.length >= 2 ? draftToReportItems(reportItems) : null,
      });
    } catch (err) { console.error('Add invoice failed:', err); setError('Could not add the invoice. Please try again.'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="card w-full max-w-md max-h-[92vh] overflow-y-auto rounded-b-none md:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="text-base font-bold text-navy-50">New Invoice</h3><p className="text-xs text-navy-300 mt-0.5">{nextNumber}</p></div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Link to Job (optional)</label>
            <select className="input" value={form.job_id} onChange={e => { const job = jobs.find(j => j.id === e.target.value); setForm(f => ({ ...f, job_id: e.target.value, customer_name: job?.customer_name || f.customer_name })); }}>
              <option value="">No linked job</option>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.customer_name}</option>)}
            </select>
          </div>
          <div><label className="label">Customer Name *</label><input className="input" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="John Smith" /></div>
          <div><label className="label">Amount ($) *</label><input className="input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="1500" /></div>

          <AttachJobPhotosPicker
            availableMedia={availableMedia}
            reportItems={reportItems}
            onToggle={toggleReportItem}
            onCaption={setReportCaption}
          />

          {error && <p className="text-xs text-error-400">{error}</p>}
          <div className="flex items-center gap-2 pt-1"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Draft'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AttachJobPhotosPicker({ availableMedia, reportItems, onToggle, onCaption }: {
  availableMedia: { id: string; localUrl: string; photo_url: string | null; caption: string; phase: 'before' | 'after' | null; kind?: 'photo' | 'video' }[];
  reportItems: PhotoReportDraftItem[];
  onToggle: (p: (typeof availableMedia)[number]) => void;
  onCaption: (entryId: string, caption: string) => void;
}) {
  return (
    <div className="rounded-xl border border-navy-700 p-3 space-y-2">
      <div>
        <p className="label mb-0">Attach Job Photos (2–6)</p>
        <p className="text-[10px] text-navy-500">Optional — selected items appear as a Before & After report on the printed invoice/quote.</p>
      </div>
      {availableMedia.length === 0 ? (
        <p className="text-xs text-navy-400">No job-site photos captured yet. Capture some in Operations → Field Cam Photos.</p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {availableMedia.map(p => {
              const picked = reportItems.some(i => i.entryId === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onToggle(p)}
                  className={`relative aspect-square rounded-lg overflow-hidden bg-navy-950 transition-all ${picked ? 'ring-2 ring-gold-400' : 'opacity-70 hover:opacity-100'}`}
                  aria-label={picked ? 'Unselect photo' : 'Select photo'}
                >
                  {p.kind === 'video' ? (
                    <video src={p.photo_url || p.localUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                  ) : (
                    <img src={p.photo_url || p.localUrl} alt={p.caption} loading="lazy" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = p.localUrl; }} />
                  )}
                  {picked && <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-gold-400 text-navy-950 text-[9px] font-bold">✓</span>}
                  {p.kind === 'video' && <span className="absolute bottom-1 left-1 rounded bg-gold-400 px-1 text-[8px] font-bold uppercase text-navy-950">Video</span>}
                </button>
              );
            })}
          </div>
          {reportItems.length > 0 && (
            <p className={`text-[10px] ${reportItems.length >= 2 ? 'text-navy-400' : 'text-warning-400'}`}>
              {reportItems.length} selected{reportItems.length < 2 ? ' — pick at least 2 to include the report' : ` — will appear on the PDF (${6 - reportItems.length} slots left)`}
            </p>
          )}
          {reportItems.length >= 2 && (
            <div className="space-y-1.5">
              {reportItems.map(item => (
                <div key={item.entryId} className="flex items-center gap-2">
                  <span className="text-[10px] text-navy-400 w-24 shrink-0 truncate">{item.caption || 'Caption'}</span>
                  <input
                    className="input text-xs py-1"
                    value={item.caption}
                    onChange={e => onCaption(item.entryId, e.target.value)}
                    placeholder='e.g. "Before" / "After"'
                    maxLength={40}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaymentsPanel({ invoices }: { invoices: Invoice[] }) {
  const { payments, updateInvoiceStatus } = useData();
  const unpaid = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('etransfer');
  const selected = invoices.find(i => i.id === selectedId);

  const methods: { key: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
    { key: 'etransfer', label: 'e-Transfer', icon: Smartphone },
    { key: 'card', label: 'Credit Card', icon: CreditCard },
    { key: 'cash', label: 'Cash', icon: Banknote },
  ];

  const handlePay = async () => {
    if (selected) { await updateInvoiceStatus(selected.id, 'paid'); setSelectedId(null); }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {unpaid.map(inv => (
          <button key={inv.id} onClick={() => setSelectedId(inv.id)} className={`card card-hover p-3 w-full text-left ${selectedId === inv.id ? 'border-gold-500' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="text-sm font-semibold text-navy-50">{inv.number}</p><p className="text-xs text-navy-300 truncate">{inv.customer_name}</p></div>
              <div className="text-right shrink-0"><p className="text-sm font-bold text-gold-400">{formatCurrency(inv.amount)}</p><InvoiceStatusBadge status={inv.status} /></div>
            </div>
          </button>
        ))}
        {unpaid.length === 0 && <div className="card p-8 text-center"><CheckCircle2 className="w-8 h-8 text-success-400 mx-auto mb-2" /><p className="text-sm text-navy-300">All invoices are paid. No outstanding payments.</p></div>}
      </div>
      {selected && (
        <div className="card p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-navy-50">Process Payment — {selected.number}</h3>
            <button onClick={() => setSelectedId(null)} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center justify-between mb-4"><span className="text-xs text-navy-300">Amount Due</span><span className="text-xl font-bold text-gold-400 font-display">{formatCurrency(selected.amount)}</span></div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {methods.map(m => (
              <button key={m.key} onClick={() => setMethod(m.key)} className={`flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all ${method === m.key ? 'bg-gold-900/40 border border-gold-600' : 'bg-navy-900 border border-navy-700'}`}>
                <m.icon className={`w-5 h-5 ${method === m.key ? 'text-gold-400' : 'text-navy-300'}`} />
                <span className={`text-xs font-semibold ${method === m.key ? 'text-gold-300' : 'text-navy-300'}`}>{m.label}</span>
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-navy-900 p-3 mb-3">
            <div className="flex items-center justify-between text-xs"><span className="text-navy-300">Customer</span><span className="text-navy-100 font-medium">{selected.customer_name}</span></div>
            <div className="flex items-center justify-between text-xs mt-2"><span className="text-navy-300">Payment Method</span><span className="text-navy-100 font-medium capitalize">{method}</span></div>
            <div className="flex items-center justify-between text-xs mt-2"><span className="text-navy-300">Total</span><span className="text-gold-400 font-bold">{formatCurrency(selected.amount)}</span></div>
          </div>
          <button onClick={handlePay} className="btn-primary w-full"><DollarSign className="w-4 h-4" /> Mark as Paid</button>
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div>
          <h3 className="section-title mb-2">Payment History</h3>
          <div className="space-y-1.5">
            {payments.slice(0, 10).map(p => (
              <div key={p.id} className="card p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${p.method === 'etransfer' ? 'bg-teal-900/40' : p.method === 'cash' ? 'bg-success-900/40' : 'bg-accent-900/40'}`}>
                    {p.method === 'etransfer' ? <Smartphone className="w-4 h-4 text-teal-400" /> : p.method === 'cash' ? <Banknote className="w-4 h-4 text-success-400" /> : <CreditCard className="w-4 h-4 text-accent-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-100 truncate">{p.customer_name}</p>
                    <p className="text-xs text-navy-400 truncate">{p.method === 'etransfer' ? 'Interac e-Transfer' : p.method === 'cash' ? 'Cash' : 'Credit Card'} · {p.reference || '—'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gold-400">{formatCurrency(p.amount)}</p>
                  <span className={`text-[10px] font-bold ${p.status === 'confirmed' ? 'text-success-400' : p.status === 'pending' ? 'text-gold-400' : 'text-error-400'}`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── e-Transfer Panel ────────────────────────────────────────
function EtransferPanel({ invoices }: { invoices: Invoice[] }) {
  const { payments, customers, addPayment, updatePayment, updateInvoiceStatus, addNotification } = useData();
  const { etransferEmail, etransferRecipient } = useEtransferSettings();
  const [showRequest, setShowRequest] = useState(false);

  const etransferPayments = payments.filter(p => p.method === 'etransfer');
  const pending = etransferPayments.filter(p => p.status === 'pending');
  const confirmed = etransferPayments.filter(p => p.status === 'confirmed');
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const totalConfirmed = confirmed.reduce((s, p) => s + p.amount, 0);

  const handleConfirm = async (payment: Payment) => {
    await updatePayment(payment.id, { status: 'confirmed' });
    if (payment.invoice_id) {
      await updateInvoiceStatus(payment.invoice_id, 'paid');
    }
  };

  return (
    <div className="space-y-3">
      {/* e-Transfer info card */}
      <div className="card p-4 border-teal-700/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-900/40 border border-teal-700/30 shrink-0">
            <Building2 className="w-6 h-6 text-teal-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-navy-50">Interac e-Transfer Settings</h3>
            <p className="text-xs text-navy-300">Auto-deposit enabled — no security question required</p>
          </div>
        </div>
        <div className="space-y-2 pt-3 border-t border-navy-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-navy-300">e-Transfer Email</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-teal-300">{etransferEmail}</span>
              <CopyButton text={etransferEmail} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-navy-300">Recipient Name</span>
            <span className="text-sm font-semibold text-navy-100">{etransferRecipient}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-navy-300">Auto-Deposit</span>
            <span className="flex items-center gap-1 text-xs font-bold text-success-400"><CheckCircle2 className="w-3.5 h-3.5" /> Enabled</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card p-3">
          <div className="flex items-center gap-1.5 mb-1"><Clock className="w-4 h-4 text-gold-400" /><span className="text-xs text-navy-300">Awaiting Transfer</span></div>
          <p className="text-base font-bold text-gold-300 font-display">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-navy-400 mt-0.5">{pending.length} request{pending.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-4 h-4 text-success-400" /><span className="text-xs text-navy-300">Received via e-Transfer</span></div>
          <p className="text-base font-bold text-success-300 font-display">{formatCurrency(totalConfirmed)}</p>
          <p className="text-xs text-navy-400 mt-0.5">{confirmed.length} payment{confirmed.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <button onClick={() => setShowRequest(true)} className="btn-primary w-full"><Send className="w-4 h-4" /> Request e-Transfer Payment</button>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div>
          <h3 className="section-title mb-2">Awaiting e-Transfer</h3>
          <div className="space-y-2">
            {pending.map(p => {
              const inv = invoices.find(i => i.id === p.invoice_id);
              const daysSince = p.requested_at ? Math.floor((Date.now() - new Date(p.requested_at).getTime()) / 86400000) : 0;
              return (
                <div key={p.id} className="card p-3 border-gold-700/30">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-50 truncate">{p.customer_name}</p>
                      <p className="text-xs text-navy-300 truncate">Ref: {p.reference || '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gold-400">{formatCurrency(p.amount)}</p>
                      <p className={`text-[10px] ${daysSince > 3 ? 'text-error-400' : 'text-navy-400'}`}>{daysSince === 0 ? 'Today' : `${daysSince}d ago`}</p>
                    </div>
                  </div>
                  {inv && <p className="text-xs text-navy-400 mb-2">Invoice {inv.number}</p>}
                  <div className="flex items-center gap-2 pt-2 border-t border-navy-700">
                    <button onClick={() => handleConfirm(p)} className="btn-primary text-xs py-1.5 px-3"><CheckCircle2 className="w-3 h-3" /> Confirm Received</button>
                    <button
                      onClick={async () => {
                        const c = customers.find(cu => cu.name === p.customer_name);
                        if (c) {
                          await addNotification({
                            type: 'sms',
                            recipient: c.phone,
                            recipient_name: p.customer_name,
                            subject: 'Payment Reminder',
                            body: `Hi ${p.customer_name?.split(' ')[0] || 'there'}, this is a friendly reminder that your e-Transfer of ${formatCurrency(p.amount)} for invoice ${p.reference} is still pending. Please send to ${etransferEmail}. Thank you! — ${COMPANY.shortName}`,
                            status: 'sent',
                            related_job_id: null,
                            related_invoice_id: p.invoice_id,
                          });
                        }
                      }}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      <Mail className="w-3 h-3" /> Remind
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmed history */}
      {confirmed.length > 0 && (
        <div>
          <h3 className="section-title mb-2">Received e-Transfers</h3>
          <div className="space-y-1.5">
            {confirmed.map(p => (
              <div key={p.id} className="card p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-success-900/40 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-success-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-100 truncate">{p.customer_name}</p>
                    <p className="text-xs text-navy-400 truncate">{p.reference} · {formatShortDate(p.confirmed_at || p.requested_at)}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-success-300 shrink-0">{formatCurrency(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {etransferPayments.length === 0 && (
        <div className="card p-8 text-center">
          <Smartphone className="w-8 h-8 text-navy-600 mx-auto mb-2" />
          <p className="text-sm text-navy-300">No e-Transfer requests yet.</p>
          <p className="text-xs text-navy-400 mt-1">Send a payment request to get started.</p>
        </div>
      )}

      {showRequest && (
        <EtransferRequestModal
          invoices={invoices}
          customers={customers}
          etransferEmail={etransferEmail}
          etransferRecipient={etransferRecipient}
          onClose={() => setShowRequest(false)}
          onSubmit={async (data) => {
            await addPayment({
              invoice_id: data.invoiceId,
              customer_name: data.customerName,
              amount: data.amount,
              method: 'etransfer',
              reference: data.reference,
              status: 'pending',
              requested_at: new Date().toISOString(),
              confirmed_at: null,
              notes: '',
            });
            if (data.notifyPhone) {
              await addNotification({
                type: 'sms',
                recipient: data.notifyPhone,
                recipient_name: data.customerName,
                subject: 'e-Transfer Request',
                body: `Hi ${data.customerName?.split(' ')[0] || 'there'}, please send your e-Transfer of ${formatCurrency(data.amount)} to ${etransferEmail}. Reference: ${data.reference}. Thank you! — ${COMPANY.shortName}`,
                status: 'sent',
                related_job_id: null,
                related_invoice_id: data.invoiceId,
              });
            }
            setShowRequest(false);
          }}
        />
      )}
    </div>
  );
}

function EtransferRequestModal({ invoices, customers, etransferEmail, etransferRecipient, onClose, onSubmit }: {
  invoices: Invoice[];
  customers: { id: string; name: string; phone: string; email: string }[];
  etransferEmail: string;
  etransferRecipient: string;
  onClose: () => void;
  onSubmit: (data: { invoiceId: string | null; customerName: string; amount: number; reference: string; notifyPhone: string }) => Promise<void>;
}) {
  const unpaid = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');
  const [invoiceId, setInvoiceId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customer = customers.find(c => c.name === customerName);
  const notifyPhone = sendSms ? (customer?.phone || '') : '';

  const handleInvoiceSelect = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      setCustomerName(inv.customer_name);
      setAmount(String(inv.amount));
      setReference(inv.number);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !amount) { setError('Customer name and amount are required'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        invoiceId: invoiceId || null,
        customerName: customerName.trim(),
        amount: parseFloat(amount) || 0,
        reference: reference.trim(),
        notifyPhone,
      });
    } catch (err) {
      console.error('Send payment request failed:', err);
      setError('Could not send the request. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="card w-full max-w-md max-h-[92vh] overflow-y-auto rounded-b-none md:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-navy-50">Request e-Transfer</h3>
            <p className="text-xs text-navy-300 mt-0.5">Send payment instructions to customer</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {unpaid.length > 0 && (
            <div>
              <label className="label">Link to Unpaid Invoice</label>
              <select className="input" value={invoiceId} onChange={e => handleInvoiceSelect(e.target.value)}>
                <option value="">No linked invoice</option>
                {unpaid.map(i => <option key={i.id} value={i.id}>{i.number} — {i.customer_name} ({formatCurrency(i.amount)})</option>)}
              </select>
            </div>
          )}
          <div><label className="label">Customer Name *</label><input className="input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Smith" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount ($) *</label><input className="input" type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1500" /></div>
            <div><label className="label">Reference</label><input className="input" value={reference} onChange={e => setReference(e.target.value)} placeholder="INV-2026-001" /></div>
          </div>

          {/* e-Transfer instructions preview */}
          <div className="rounded-xl bg-teal-900/20 border border-teal-800/40 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-teal-300 mb-1">Customer will receive:</p>
            <p className="text-xs text-navy-200">Send e-Transfer of <span className="font-bold text-teal-300">{formatCurrency(parseFloat(amount) || 0)}</span> to:</p>
            <p className="text-sm font-bold text-teal-300">{etransferEmail}</p>
            <p className="text-xs text-navy-300">Recipient: {etransferRecipient}</p>
            <p className="text-xs text-navy-400">Auto-deposit enabled — no security question needed.</p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sendSms} onChange={e => setSendSms(e.target.checked)} className="w-4 h-4 rounded accent-gold-400" />
            <span className="text-xs text-navy-200">Send SMS notification to customer{customer ? ` (${customer.phone})` : ''}</span>
          </label>

          {error && <p className="text-xs text-error-400">{error}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Sending...' : 'Send Request'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SquarePanel({ invoices }: { invoices: Invoice[] }) {
  const { payments, addPayment, updatePayment, updateInvoiceStatus, addNotification, customers } = useData();
  const [showManual, setShowManual] = useState(false);
  const [copied, setCopied] = useState(false);

  const squarePayments = payments.filter(p => p.method === 'card');
  const confirmed = squarePayments.filter(p => p.status === 'confirmed');
  const pending = squarePayments.filter(p => p.status === 'pending');
  const totalConfirmed = confirmed.reduce((s, p) => s + p.amount, 0);
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);

  const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');

  const copyLink = () => {
    navigator.clipboard?.writeText(COMPANY.squareCheckoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async (payment: Payment) => {
    await updatePayment(payment.id, { status: 'confirmed' });
    if (payment.invoice_id) {
      await updateInvoiceStatus(payment.invoice_id, 'paid');
    }
  };

  return (
    <div className="space-y-3">
      {/* Square checkout link card */}
      <div className="card p-4 border-accent-700/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-900/40 border border-accent-700/30 shrink-0">
            <CreditCard className="w-6 h-6 text-accent-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-navy-50">Square Online Checkout</h3>
            <p className="text-xs text-navy-300">Card payments via your Square link</p>
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t border-navy-700">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-navy-300 shrink-0">Checkout Link</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono text-accent-300 truncate">{COMPANY.squareCheckoutUrl}</span>
              <button onClick={copyLink} className="btn-ghost p-1 shrink-0" aria-label="Copy link">
                {copied ? <Check className="w-3.5 h-3.5 text-success-400" /> : <Copy className="w-3.5 h-3.5 text-navy-400" />}
              </button>
            </div>
          </div>
        </div>

        <a href={COMPANY.squareCheckoutUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full mt-3">
          <ExternalLink className="w-4 h-4" /> Open Square Checkout
        </a>
      </div>

      {/* Send link to customer */}
      <SendSquareLinkModal
        invoices={unpaidInvoices}
        customers={customers}
        open={showManual}
        onClose={() => setShowManual(false)}
        onSubmit={async (data) => {
          await addPayment({
            invoice_id: data.invoiceId,
            customer_name: data.customerName,
            amount: data.amount,
            method: 'card',
            reference: data.reference,
            status: 'pending',
            requested_at: new Date().toISOString(),
            confirmed_at: null,
            notes: 'Square checkout link sent',
          });
          if (data.notifyPhone) {
            await addNotification({
              type: 'sms',
              recipient: data.notifyPhone,
              recipient_name: data.customerName,
              subject: 'Payment Link',
              body: `Hi ${data.customerName?.split(' ')[0] || 'there'}, you can pay your invoice of ${formatCurrency(data.amount)} online here: ${COMPANY.squareCheckoutUrl} — ${COMPANY.shortName}`,
              status: 'sent',
              related_job_id: null,
              related_invoice_id: data.invoiceId,
            });
          }
          setShowManual(false);
        }}
      />

      <button onClick={() => setShowManual(true)} className="btn-secondary w-full">
        <Send className="w-4 h-4" /> Send Square Link to Customer
      </button>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card p-3">
          <div className="flex items-center gap-1.5 mb-1"><Clock className="w-4 h-4 text-gold-400" /><span className="text-xs text-navy-300">Awaiting Payment</span></div>
          <p className="text-base font-bold text-gold-300 font-display">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-navy-400 mt-0.5">{pending.length} pending</p>
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-4 h-4 text-success-400" /><span className="text-xs text-navy-300">Received via Card</span></div>
          <p className="text-base font-bold text-success-300 font-display">{formatCurrency(totalConfirmed)}</p>
          <p className="text-xs text-navy-400 mt-0.5">{confirmed.length} payment{confirmed.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Pending card payments */}
      {pending.length > 0 && (
        <div>
          <h3 className="section-title mb-2">Awaiting Card Payment</h3>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="card p-3 border-gold-700/30">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-50 truncate">{p.customer_name}</p>
                    <p className="text-xs text-navy-300 truncate">Ref: {p.reference || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gold-400">{formatCurrency(p.amount)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-navy-700">
                  <a href={COMPANY.squareCheckoutUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs py-1.5 px-3">
                    <ExternalLink className="w-3 h-3" /> Checkout Link
                  </a>
                  <button onClick={() => handleConfirm(p)} className="btn-primary text-xs py-1.5 px-3">
                    <CheckCircle2 className="w-3 h-3" /> Confirm Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed history */}
      {confirmed.length > 0 && (
        <div>
          <h3 className="section-title mb-2">Card Payments Received</h3>
          <div className="space-y-1.5">
            {confirmed.map(p => (
              <div key={p.id} className="card p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-success-900/40 shrink-0">
                    <CreditCard className="w-4 h-4 text-success-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-100 truncate">{p.customer_name}</p>
                    <p className="text-xs text-navy-400 truncate">{p.reference} · {formatShortDate(p.confirmed_at || p.requested_at)}</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-success-300 shrink-0">{formatCurrency(p.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {squarePayments.length === 0 && (
        <div className="card p-8 text-center">
          <CreditCard className="w-8 h-8 text-navy-600 mx-auto mb-2" />
          <p className="text-sm text-navy-300">No Square card payments yet.</p>
          <p className="text-xs text-navy-400 mt-1">Send your checkout link to a customer to get started.</p>
        </div>
      )}
    </div>
  );
}

function SendSquareLinkModal({ invoices, customers, open, onClose, onSubmit }: {
  invoices: Invoice[];
  customers: { id: string; name: string; phone: string; email: string }[];
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { invoiceId: string | null; customerName: string; amount: number; reference: string; notifyPhone: string }) => Promise<void>;
}) {
  const [invoiceId, setInvoiceId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customer = customers.find(c => c.name === customerName);
  const notifyPhone = sendSms ? (customer?.phone || '') : '';

  const handleInvoiceSelect = (id: string) => {
    setInvoiceId(id);
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      setCustomerName(inv.customer_name);
      setAmount(String(inv.amount));
      setReference(inv.number);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !amount) { setError('Customer name and amount are required'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        invoiceId: invoiceId || null,
        customerName: customerName.trim(),
        amount: parseFloat(amount) || 0,
        reference: reference.trim(),
        notifyPhone,
      });
    } catch (err) {
      console.error('Send payment link failed:', err);
      setError('Could not send the link. Please try again.');
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="card w-full max-w-md max-h-[92vh] overflow-y-auto rounded-b-none md:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-navy-50">Send Square Payment Link</h3>
            <p className="text-xs text-navy-300 mt-0.5">Customer pays online via Square</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {invoices.length > 0 && (
            <div>
              <label className="label">Link to Unpaid Invoice</label>
              <select className="input" value={invoiceId} onChange={e => handleInvoiceSelect(e.target.value)}>
                <option value="">No linked invoice</option>
                {invoices.map(i => <option key={i.id} value={i.id}>{i.number} — {i.customer_name} ({formatCurrency(i.amount)})</option>)}
              </select>
            </div>
          )}
          <div><label className="label">Customer Name *</label><input className="input" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Smith" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount ($) *</label><input className="input" type="number" step="any" value={amount} onChange={e => setAmount(e.target.value)} placeholder="1500" /></div>
            <div><label className="label">Reference</label><input className="input" value={reference} onChange={e => setReference(e.target.value)} placeholder="INV-2026-001" /></div>
          </div>

          <div className="rounded-xl bg-accent-900/20 border border-accent-800/40 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-accent-300 mb-1">Customer will receive:</p>
            <p className="text-xs text-navy-200">SMS with Square checkout link to pay <span className="font-bold text-accent-300">{formatCurrency(parseFloat(amount) || 0)}</span></p>
            <p className="text-xs font-mono text-accent-300 break-all">{COMPANY.squareCheckoutUrl}</p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={sendSms} onChange={e => setSendSms(e.target.checked)} className="w-4 h-4 rounded accent-gold-400" />
            <span className="text-xs text-navy-200">Send SMS to customer{customer ? ` (${customer.phone})` : ''}</span>
          </label>

          {error && <p className="text-xs text-error-400">{error}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Sending...' : 'Send Link'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="btn-ghost p-1"
      aria-label="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-success-400" /> : <Copy className="w-3.5 h-3.5 text-navy-400" />}
    </button>
  );
}
