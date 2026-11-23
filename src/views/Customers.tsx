import { useState, useMemo } from 'react';
import {
  Users, Plus, X, Phone, Mail, MapPin, FileText,
  Search, ChevronRight, Trash2, Edit3, Briefcase, DollarSign, Receipt,
} from 'lucide-react';
import { useData } from '@/lib/data';
import { formatCurrency, formatDate } from '@/lib/format';
import { SERVICE_ICONS } from '@/lib/constants';
import ServiceIcon from '@/components/ServiceIcon';
import type { Customer, Service } from '@/lib/types';

interface CustomersProps {
  serviceFilter: string | null;
}

export default function Customers({ serviceFilter }: CustomersProps) {
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
          onNewJob={() => { setJobForCustomer(selected); setSelectedId(null); }}
          onNewInvoice={() => { setInvoiceForCustomer(selected); setSelectedId(null); }}
          onEdit={() => { setEditing(selected); setSelectedId(null); }}
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

function CustomerDetailDrawer({ customer, jobs, invoices, onClose, onNewJob, onNewInvoice, onEdit, onDelete }: {
  customer: Customer;
  jobs: { id: string; service_key: string; status: string; value: number; scheduled_date: string | null; rating: number | null; notes?: string }[];
  invoices: { id: string; number: string; amount: number; status: string; paid_at: string | null }[];
  onClose: () => void;
  onNewJob: () => void;
  onNewInvoice: () => void;
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

