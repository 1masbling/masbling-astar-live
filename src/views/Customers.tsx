import { useState, useMemo } from 'react';
import {
  Users, Plus, X, Phone, Mail, MapPin, FileText,
  Search, ChevronRight, Trash2, Edit3, Briefcase, DollarSign, Receipt, Camera,
} from 'lucide-react';
import { useData } from '@/lib/data';
import { formatCurrency, formatDate, serviceDisplayName } from '@/lib/format';
import { SERVICE_PRICING, SERVICE_ICONS } from '@/lib/constants';
import ServiceIcon from '@/components/ServiceIcon';
import type { Customer, Invoice, Job, JobStatus, InvoiceStatus, Service } from '@/lib/types';

export interface CameraMediaPrefill {
  title: string;
  city: string;
}

interface CustomersProps {
  serviceFilter: string | null;
  onAddJobMedia?: (prefill: CameraMediaPrefill) => void;
}

export default function Customers({ serviceFilter, onAddJobMedia }: CustomersProps) {
  const {
    customers, jobs, invoices, services,
    addCustomer, updateCustomer, deleteCustomer, addJob, addInvoice,
  } = useData();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [jobForCustomer, setJobForCustomer] = useState<Customer | null>(null);
  const [invoiceForCustomer, setInvoiceForCustomer] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const byService = serviceFilter
      ? customers.filter(c => jobs.some(j => j.customer_id === c.id && j.service_key === serviceFilter))
      : customers;
    if (!search.trim()) return byService;
    const q = search.toLowerCase();
    return byService.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q)
    );
  }, [customers, jobs, search, serviceFilter]);

  const selected = customers.find(c => c.id === selectedId);

  const stats = useMemo(() => {
    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    const activeCustomers = new Set(jobs.filter(j => j.status !== 'complete' && j.customer_id).map(j => j.customer_id)).size;
    return { total: customers.length, totalRevenue, activeCustomers };
  }, [customers, invoices, jobs]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-navy-50 font-display">Customers</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Customer</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3"><div className="flex items-center gap-1.5 mb-1"><Users className="w-4 h-4 text-gold-400" /><span className="text-xs text-navy-300">Total</span></div><p className="text-base font-bold text-navy-50 font-display">{stats.total}</p></div>
        <div className="card p-3"><div className="flex items-center gap-1.5 mb-1"><Briefcase className="w-4 h-4 text-teal-400" /><span className="text-xs text-navy-300">Active</span></div><p className="text-base font-bold text-navy-50 font-display">{stats.activeCustomers}</p></div>
        <div className="card p-3"><div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-4 h-4 text-success-400" /><span className="text-xs text-navy-300">Revenue</span></div><p className="text-base font-bold text-success-300 font-display">{formatCurrency(stats.totalRevenue)}</p></div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
        <input
          className="input pl-9"
          placeholder="Search by name, phone, email, or address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filtered.map(c => {
          const jobCount = jobs.filter(j => j.customer_id === c.id).length;
          const invTotal = invoices.filter(i => i.customer_id === c.id).reduce((s, i) => s + i.amount, 0);
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className="card card-hover p-3 w-full text-left group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-700 shrink-0">
                    <span className="text-sm font-bold text-gold-400">{c.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-50 truncate">{c.name}</p>
                    <p className="text-xs text-navy-300 truncate">{c.phone || 'No phone'} · {jobCount} job{jobCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-gold-400">{formatCurrency(invTotal)}</span>
                  <ChevronRight className="w-4 h-4 text-navy-500 group-hover:text-gold-400 transition-all" />
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="card p-8 text-center"><Users className="w-8 h-8 text-navy-600 mx-auto mb-2" /><p className="text-sm text-navy-300">{search ? 'No customers match your search.' : 'No customers yet. Add your first customer.'}</p></div>
        )}
      </div>

      {selected && (
        <CustomerDetailDrawer
          customer={selected}
          jobs={jobs.filter(j => j.customer_id === selected.id)}
          invoices={invoices.filter(i => i.customer_id === selected.id)}
          onClose={() => setSelectedId(null)}
          onNewJob={() => setJobForCustomer(selected)}
          onNewInvoice={() => setInvoiceForCustomer(selected)}
          onAddJobMedia={() => onAddJobMedia?.({ title: selected.name, city: selected.address })}
          onEdit={() => setEditing(selected)}
          onDelete={async () => { await deleteCustomer(selected.id); setSelectedId(null); }}
        />
      )}

      {showAdd && (
        <CustomerFormModal
          onClose={() => setShowAdd(false)}
          onSave={async (c) => { await addCustomer(c); setShowAdd(false); }}
        />
      )}

      {editing && (
        <CustomerFormModal
          customer={editing}
          onClose={() => setEditing(null)}
          onSave={async (c) => { await updateCustomer(editing.id, c); setEditing(null); }}
        />
      )}

      {jobForCustomer && (
        <CustomerNewJobModal
          customer={jobForCustomer}
          services={services}
          onClose={() => setJobForCustomer(null)}
          onSave={async (jobData) => {
            await addJob(jobData);
            setJobForCustomer(null);
            setSelectedId(jobForCustomer.id);
          }}
        />
      )}

      {invoiceForCustomer && (
        <CustomerNewInvoiceModal
          customer={invoiceForCustomer}
          customerJobs={jobs.filter(j => j.customer_id === invoiceForCustomer.id)}
          nextInvoiceNumber={`INV-${String(invoices.length + 101).padStart(4, '0')}`}
          onClose={() => setInvoiceForCustomer(null)}
          onSave={async (invData) => {
            await addInvoice(invData);
            setInvoiceForCustomer(null);
            setSelectedId(invoiceForCustomer.id);
          }}
        />
      )}
    </div>
  );
}

function CustomerDetailDrawer({ customer, jobs, invoices, onClose, onNewJob, onNewInvoice, onAddJobMedia, onEdit, onDelete }: {
  customer: Customer;
  jobs: { id: string; service_key: string; status: string; value: number; scheduled_date: string | null; rating: number | null; notes?: string }[];
  invoices: { id: string; number: string; amount: number; status: string; paid_at: string | null }[];
  onClose: () => void;
  onNewJob: () => void;
  onNewInvoice: () => void;
  onAddJobMedia: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue' || i.status === 'draft').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="card w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-b-none md:rounded-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-navy-800/95 backdrop-blur-sm border-b border-navy-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-400/20">
              <span className="text-base font-bold text-gold-400">{customer.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-50">{customer.name}</h3>
              <p className="text-xs text-navy-300">Customer since {formatDate(customer.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            {customer.phone && <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-navy-100 hover:text-gold-400"><Phone className="w-4 h-4 text-navy-400" /> {customer.phone}</a>}
            {customer.email && <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-navy-100 hover:text-gold-400"><Mail className="w-4 h-4 text-navy-400" /> {customer.email}</a>}
            {customer.address && <p className="flex items-center gap-2 text-sm text-navy-200"><MapPin className="w-4 h-4 text-navy-400 shrink-0" /> {customer.address}</p>}
            {customer.notes && <p className="flex items-start gap-2 text-xs text-navy-300 bg-navy-900/60 p-2.5 rounded-lg"><FileText className="w-3.5 h-3.5 text-navy-400 shrink-0 mt-0.5" /> {customer.notes}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={onNewJob} className="btn-primary justify-center"><Briefcase className="w-4 h-4" /> + New Job</button>
            <button onClick={onNewInvoice} className="btn-secondary justify-center"><Receipt className="w-4 h-4" /> + New Invoice</button>
          </div>

          <button onClick={onAddJobMedia} className="btn-secondary w-full justify-center"><Camera className="w-4 h-4" /> + Add Job Photo / Video</button>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-navy-900/70 rounded-xl p-3">
              <p className="text-xs text-navy-400">Paid</p>
              <p className="text-sm font-bold text-success-300">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-navy-900/70 rounded-xl p-3">
              <p className="text-xs text-navy-400">Outstanding</p>
              <p className="text-sm font-bold text-gold-400">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-navy-300 uppercase tracking-wider mb-2">Jobs ({jobs.length})</h4>
            {jobs.length === 0 ? (
              <p className="text-xs text-navy-400 bg-navy-900/50 rounded-lg p-3 text-center">No jobs yet for this customer.</p>
            ) : (
              <div className="space-y-1.5">
                {jobs.map(j => (
                  <div key={j.id} className="flex items-center justify-between bg-navy-900/60 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ServiceIcon name={SERVICE_ICONS[j.service_key] || 'Wrench'} className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-navy-100 truncate">{serviceDisplayName(j.service_key)}</p>
                        <p className="text-[11px] text-navy-400 capitalize">{j.status}{j.scheduled_date ? ` · ${formatDate(j.scheduled_date)}` : ''}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-navy-100 shrink-0">{formatCurrency(j.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-navy-300 uppercase tracking-wider mb-2">Invoices ({invoices.length})</h4>
            {invoices.length === 0 ? (
              <p className="text-xs text-navy-400 bg-navy-900/50 rounded-lg p-3 text-center">No invoices yet for this customer.</p>
            ) : (
              <div className="space-y-1.5">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between bg-navy-900/60 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-navy-100">{inv.number}</p>
                      <p className="text-[11px] text-navy-400 capitalize">{inv.status}{inv.paid_at ? ` · Paid ${formatDate(inv.paid_at)}` : ''}</p>
                    </div>
                    <span className="text-xs font-bold text-gold-400">{formatCurrency(inv.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-navy-700 flex items-center justify-between gap-2">
            <button onClick={onEdit} className="btn-secondary"><Edit3 className="w-4 h-4" /> Edit Customer</button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="btn-ghost text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /> Delete</button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button onClick={onDelete} className="btn-primary bg-red-600 hover:bg-red-500 text-xs py-1.5 px-2.5">Confirm</button>
                <button onClick={() => setConfirmDelete(false)} className="btn-ghost text-xs py-1.5 px-2">Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerNewJobModal({ customer, services, onClose, onSave }: {
  customer: Customer;
  services: Service[];
  onClose: () => void;
  onSave: (jobData: Omit<Job, 'id' | 'created_at'>) => Promise<void>;
}) {
  const fallbackServices = [
    { key: 'gutter_cleaning', label: 'Gutter Cleaning / Eavestrough' },
    { key: 'heated_wires', label: 'Heated Wires' },
    { key: 'christmas_lights', label: 'Christmas Lights' },
    { key: 'handyman', label: 'Handyman' },
  ];
  const serviceOptions: { key: string; label: string }[] = services.length > 0
    ? [
        ...services.map(s => ({ key: s.key, label: s.label })),
        ...(!services.some(s => s.key === 'handyman') ? [{ key: 'handyman', label: 'Handyman' }] : []),
      ]
    : fallbackServices;
  const [serviceKey, setServiceKey] = useState(serviceOptions[0]?.key || 'gutter_cleaning');
  const [customService, setCustomService] = useState('');
  const [price, setPrice] = useState(String(SERVICE_PRICING[serviceOptions[0]?.key || 'gutter_cleaning'] ?? 190));
  const [addHst, setAddHst] = useState(false);
  const [status, setStatus] = useState<JobStatus>('scheduled');
  const [scheduledDate, setScheduledDate] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = Number(price) || 0;
  const total = addHst ? subtotal * 1.13 : subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        address: customer.address,
        service_key: serviceKey,
        status,
        urgent: false,
        value: Number(total.toFixed(2)),
        scheduled_date: scheduledDate || null,
        time_window: timeWindow.trim() || null,
        technician_id: null,
        rating: null,
        notes: customService.trim()
          ? `Custom service: ${customService.trim()}${notes.trim() ? ` — ${notes.trim()}` : ''}`
          : notes.trim(),
        lead_source: null,
        referrer: null,
        utm_data: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the job. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} className="card w-full max-w-xl rounded-b-none md:rounded-2xl p-5 space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-navy-50">New Job</h3>
            <p className="text-xs text-navy-300">For {customer.name}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="bg-navy-900/60 rounded-xl px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-navy-50">{customer.name}</p>
          {customer.phone && <p className="text-xs text-navy-300">{customer.phone}</p>}
          {customer.email && <p className="text-xs text-navy-300">{customer.email}</p>}
          {customer.address && <p className="text-xs text-navy-300">{customer.address}</p>}
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Service</label>
            <select className="input" value={serviceKey} onChange={e => {
              const key = e.target.value;
              setServiceKey(key);
              if (SERVICE_PRICING[key] !== undefined) setPrice(String(SERVICE_PRICING[key]));
            }}>
              {serviceOptions.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Custom Service Description (Optional)</label>
            <input className="input" value={customService} onChange={e => setCustomService(e.target.value)} placeholder="e.g. Repaired loose downspout" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Price ($)</label>
              <input className="input" type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder={SERVICE_PRICING[serviceKey] !== undefined ? String(SERVICE_PRICING[serviceKey]) : undefined} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value as JobStatus)}>
                <option value="estimate">Estimate</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={addHst} onChange={e => setAddHst(e.target.checked)} className="w-4 h-4 accent-amber-400" />
              <span className="text-sm text-navy-100">Add 13% HST</span>
            </label>
            <p className="text-xs text-navy-300 mt-1.5">Total {addHst ? 'including 13% HST' : 'before HST'}: <span className="font-bold text-gold-400">{formatCurrency(total)}</span></p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Scheduled Date</label>
              <input className="input" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Time Window</label>
              <input className="input" value={timeWindow} onChange={e => setTimeWindow(e.target.value)} placeholder="9:00 AM – 11:00 AM" />
            </div>
          </div>
          <div>
            <label className="label">Job Notes</label>
            <textarea className="input min-h-[64px]" placeholder="Details, measurements, materials..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CustomerNewInvoiceModal({ customer, customerJobs, nextInvoiceNumber, onClose, onSave }: {
  customer: Customer;
  customerJobs: { id: string; service_key: string; value: number }[];
  nextInvoiceNumber: string;
  onClose: () => void;
  onSave: (invData: Omit<Invoice, 'id' | 'created_at'>) => Promise<void>;
}) {
  const [number, setNumber] = useState(nextInvoiceNumber);
  const [jobId, setJobId] = useState('');
  const [amount, setAmount] = useState(customerJobs?.[0]?.value ? String(customerJobs[0].value) : '190');
  const [status, setStatus] = useState<InvoiceStatus>('sent');
  const [addHst, setAddHst] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = Number(amount) || 0;
  const total = addHst ? subtotal * 1.13 : subtotal;

  const handleJobChange = (selectedJobId: string) => {
    setJobId(selectedJobId);
    const matched = customerJobs.find(j => j.id === selectedJobId);
    if (matched) setAmount(String(matched.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        customer_id: customer.id,
        customer_name: customer.name,
        job_id: jobId || null,
        number: number.trim(),
        amount: Number(total.toFixed(2)),
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the invoice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} className="card w-full max-w-xl rounded-b-none md:rounded-2xl p-5 space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-navy-50">New Invoice</h3>
            <p className="text-xs text-navy-300">{customer.name}</p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="bg-navy-900/60 rounded-xl px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-navy-50">{customer.name}</p>
          {customer.phone && <p className="text-xs text-navy-300">{customer.phone}</p>}
          {customer.email && <p className="text-xs text-navy-300">{customer.email}</p>}
          {customer.address && <p className="text-xs text-navy-300">{customer.address}</p>}
        </div>

        {customerJobs.length > 0 && (
          <div>
            <label className="label">Linked Job (Optional)</label>
            <select className="input" value={jobId} onChange={e => handleJobChange(e.target.value)}>
              <option value="">No linked job</option>
              {customerJobs.map(j => (
                <option key={j.id} value={j.id}>{serviceDisplayName(j.service_key)} ({formatCurrency(j.value)})</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Invoice #</label>
            <input className="input" value={number} onChange={e => setNumber(e.target.value)} required />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value as InvoiceStatus)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Amount ($ CAD) *</label>
          <input className="input" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="339.00" required />
          <label className="flex items-center gap-2.5 cursor-pointer select-none mt-2">
            <input type="checkbox" checked={addHst} onChange={e => setAddHst(e.target.checked)} className="w-4 h-4 accent-amber-400" />
            <span className="text-sm text-navy-100">Add 13% HST</span>
          </label>
          <p className="text-xs text-navy-300 mt-1.5">Total {addHst ? 'including 13% HST' : 'before HST'}: <span className="font-bold text-gold-400">{formatCurrency(total)}</span></p>
        </div>

        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Create Invoice'}</button>
        </div>
      </form>
    </div>
  );
}

function CustomerFormModal({ customer, onClose, onSave }: {
  customer?: Customer;
  onClose: () => void;
  onSave: (c: Omit<Customer, 'id' | 'created_at'>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    notes: customer?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} className="card w-full max-w-xl rounded-b-none md:rounded-2xl p-5 space-y-3 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-navy-50">{customer ? 'Edit Customer' : 'New Customer'}</h3>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Craig" required /></div>
        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="437-440-4072" /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="customer@email.com" /></div>
        </div>
        <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="84 Raylawn Crescent, Georgetown ON" /></div>
        <div><label className="label">Notes</label><textarea className="input min-h-[60px]" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Property notes..." /></div>
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : customer ? 'Save Changes' : 'Add Customer'}</button>
        </div>
      </form>
    </div>
  );
}

