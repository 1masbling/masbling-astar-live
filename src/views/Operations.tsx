import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  Headphones, CalendarClock, ClipboardList, Camera, Plus, X,
  MapPin, CheckCircle2, Circle, Star, MessageSquare, Mail, Send,
  Bell, UserCog, Shield, Lock, KeyRound, ShieldCheck, Clock, AlertCircle,
} from 'lucide-react';
import { useData } from '@/lib/data';
import { formatShortDate, formatRelative, daysUntil, serviceDisplayName } from '@/lib/format';
import { isPasswordStrong } from '@/lib/password';
import {
  addJobPhotoLogEntry,
  getJobPhotoLog,
  removeJobPhotoLogEntry,
  subscribeToJobPhotoLog,
  type JobPhotoLogEntry,
} from '@/lib/job-photo-log';
import { SERVICE_ICONS, FREQUENCIES, REVIEW_STATUSES, NOTIFICATION_TYPES, TECHNICIAN_COLORS, TECHNICIAN_COLOR_OPTIONS } from '@/lib/constants';
import ServiceIcon from '@/components/ServiceIcon';
import ProjectPhotoForm from '@/components/ProjectPhotoForm';
import CsrAiAssistant from '@/components/CsrAiAssistant';
import type { Schedule, ReviewStatus, NotificationType, DataDeletionRequest, DeletionRequestStatus } from '@/lib/types';

type Tab = 'csr' | 'scheduling' | 'checklists' | 'camera' | 'reviews' | 'notifications' | 'staff' | 'deletion';

export default function Operations({ initialTab = 'csr' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const tabs: { key: Tab; label: string; icon: typeof Headphones }[] = [
    { key: 'csr', label: 'CSR', icon: Headphones },
    { key: 'scheduling', label: 'Scheduling', icon: CalendarClock },
    { key: 'checklists', label: 'Checklists', icon: ClipboardList },
    { key: 'camera', label: 'HCP Cam', icon: Camera },
    { key: 'reviews', label: 'Reviews', icon: Star },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'staff', label: 'Staff', icon: UserCog },
    { key: 'deletion', label: 'Data Requests', icon: ShieldCheck },
  ];
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-navy-50 font-display">Operations</h2>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${tab === t.key ? 'bg-gold-400 text-navy-950' : 'bg-navy-800 text-navy-300 hover:bg-navy-700'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'csr' && <CsrPanel />}
      {tab === 'scheduling' && <SchedulingPanel />}
      {tab === 'checklists' && <ChecklistsPanel />}
      {tab === 'camera' && <HcpCamPanel />}
      {tab === 'reviews' && <ReviewsPanel />}
      {tab === 'notifications' && <NotificationsPanel />}
      {tab === 'staff' && <StaffPanel />}
      {tab === 'deletion' && <DeletionRequestsPanel />}
    </div>
  );
}

function CsrPanel() {
  const { tickets, jobs, updateTicketStatus } = useData();
  return <CsrAiAssistant tickets={tickets} jobs={jobs} onResolve={(id) => updateTicketStatus(id, 'resolved')} onReopen={(id) => updateTicketStatus(id, 'open')} />;
}

function SchedulingPanel() {
  const { schedules, services, addSchedule, updateSchedule } = useData();
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy-300">{schedules.filter(s => s.active).length} active recurring schedules</p>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-xs py-2"><Plus className="w-3.5 h-3.5" /> New Schedule</button>
      </div>
      <div className="space-y-2">
        {schedules.map(s => {
          const days = daysUntil(s.next_run);
          const serviceLabel = s.service_key === 'handyman' ? 'Handyman' : (services.find(svc => svc.key === s.service_key)?.label || serviceDisplayName(s.service_key));
          return (
            <div key={s.id} className={`card card-hover p-3 ${!s.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-navy-700 shrink-0"><ServiceIcon name={SERVICE_ICONS[s.service_key] || 'Wrench'} className="w-4 h-4 text-gold-400" /></div>
                  <div className="min-w-0"><p className="text-sm font-semibold text-navy-50 truncate">{s.customer_name}</p><p className="text-xs text-navy-300 capitalize">{serviceLabel} · {s.frequency}</p></div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-bold ${days <= 7 && s.active ? 'text-gold-400' : 'text-navy-300'}`}>{s.active ? (days <= 0 ? 'Due now' : `${days}d until`) : 'Paused'}</p>
                  <p className="text-xs text-navy-400">{formatShortDate(s.next_run)}</p>
                </div>
              </div>
              {s.address && <p className="flex items-start gap-1.5 text-xs text-navy-300 mt-2"><MapPin className="w-3.5 h-3.5 text-navy-400 shrink-0 mt-0.5" /> {s.address}</p>}
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => updateSchedule(s.id, { active: !s.active })} className={`text-xs font-semibold ${s.active ? 'text-warning-400 hover:text-warning-300' : 'text-success-400 hover:text-success-300'}`}>{s.active ? 'Pause' : 'Activate'}</button>
                <span className={`inline-flex items-center gap-1 text-xs ${s.active ? 'text-success-300' : 'text-navy-400'}`}><span className={`w-2 h-2 rounded-full ${s.active ? 'bg-success-400' : 'bg-navy-500'}`} />{s.active ? 'Active' : 'Paused'}</span>
              </div>
            </div>
          );
        })}
        {schedules.length === 0 && <div className="card p-8 text-center"><CalendarClock className="w-8 h-8 text-navy-600 mx-auto mb-2" /><p className="text-sm text-navy-300">No recurring schedules yet.</p></div>}
      </div>
      {showAdd && <AddScheduleModal services={services} existingSchedules={schedules} onClose={() => setShowAdd(false)} onAdd={async (sched) => { await addSchedule(sched); setShowAdd(false); }} />}
    </div>
  );
}

function AddScheduleModal({ services, existingSchedules, onClose, onAdd }: { services: { key: string; label: string }[]; existingSchedules: Schedule[]; onClose: () => void; onAdd: (s: Omit<Schedule, 'id' | 'created_at'>) => Promise<void> }) {
  const [form, setForm] = useState({ customer_name: '', service_key: services.at(0)?.key || 'gutter', address: '', frequency: 'monthly', next_run: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockRef.current || saving) return;
    if (!form.customer_name.trim() || !form.next_run) { setError('Customer name and next run date are required'); return; }
    if (existingSchedules.some(s => s.active && s.customer_name.trim().toLowerCase() === form.customer_name.trim().toLowerCase() && s.service_key === form.service_key && s.next_run === form.next_run)) {
      setError('An active schedule for this customer, service, and date already exists.');
      return;
    }
    lockRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await onAdd({ customer_id: null, customer_name: form.customer_name.trim(), service_key: form.service_key, address: form.address.trim(), frequency: form.frequency, next_run: form.next_run, active: true });
    } catch { setError('Could not add the schedule. Please try again.'); lockRef.current = false; } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="card w-full max-w-md rounded-b-none md:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold text-navy-50">New Recurring Schedule</h3><button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button></div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="label">Customer Name *</label><input className="input" value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="John Smith" /></div>
          <div><label className="label">Service</label><select className="input" value={form.service_key} onChange={e => setForm(f => ({ ...f, service_key: e.target.value }))}>{services.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}{!services.some(s => s.key === 'handyman') && <option value="handyman">Handyman</option>}</select></div>
          <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, Toronto ON" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Frequency</label><select className="input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>{FREQUENCIES.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}</select></div>
            <div><label className="label">Next Run *</label><input className="input" type="date" value={form.next_run} onChange={e => setForm(f => ({ ...f, next_run: e.target.value }))} /></div>
          </div>
          {error && <p className="text-xs text-error-400">{error}</p>}
          <div className="flex items-center gap-2 pt-1"><button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Adding...' : 'Add Schedule'}</button></div>
        </form>
      </div>
    </div>
  );
}

function ChecklistsPanel() {
  const { checklists, jobs, toggleChecklist } = useData();

const jobsWithChecklists = jobs.filter(j => checklists.some(c => c.job_id === j.id));
  return (
    <div className="space-y-3">
      {jobsWithChecklists.length === 0 ? <div className="card p-8 text-center"><ClipboardList className="w-8 h-8 text-navy-600 mx-auto mb-2" /><p className="text-sm text-navy-300">No checklists assigned to jobs yet.</p></div> : jobsWithChecklists.map(job => {
        const items = checklists.filter(c => c.job_id === job.id);
        const completed = items.filter(c => c.completed).length;
        const progress = items.length > 0 ? (completed / items.length) * 100 : 0;
        return (
          <div key={job.id} className="card p-4">
            <div className="flex items-start justify-between gap-2 mb-2"><div className="min-w-0"><p className="text-sm font-semibold text-navy-50">{job.customer_name}</p><p className="text-xs text-navy-300">{items.at(0)?.template_name || 'Checklist'} · {completed}/{items.length} complete</p></div><span className="text-xs font-bold text-gold-400 shrink-0">{Math.round(progress)}%</span></div>
            <div className="h-1.5 bg-navy-900 rounded-full mb-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} /></div>
            <div className="space-y-1">{items.map(item => <button key={item.id} onClick={() => toggleChecklist(item.id, !item.completed)} className="flex items-center gap-2 w-full rounded-lg p-2 text-left hover:bg-navy-900 transition-all">{item.completed ? <CheckCircle2 className="w-4 h-4 text-success-400 shrink-0" /> : <Circle className="w-4 h-4 text-navy-500 shrink-0" />}<span className={`text-sm ${item.completed ? 'text-navy-400 line-through' : 'text-navy-100'}`}>{item.item_text}</span></button>)}</div>
          </div>
        );
      })}
    </div>
  );
}

function useJobPhotoLog(): JobPhotoLogEntry[] {
  return useSyncExternalStore(subscribeToJobPhotoLog, getJobPhotoLog);
}

function HcpCamPanel() {
  const { jobs } = useData();
  const logPhotos = useJobPhotoLog();
  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4"><div className="flex items-center justify-center w-9 h-9 rounded-xl bg-teal-900/40"><Camera className="w-5 h-5 text-teal-400" /></div><div><p className="text-sm font-semibold text-navy-50">HCP Cam — Job Site Photos</p><p className="text-xs text-navy-300">Capture, watermark, and publish to the website</p></div></div>
        <ProjectPhotoForm mode="single" />
      </div>
      <h3 className="section-title">Job Photos</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {logPhotos.map(photo => {
          const job = jobs.find(j => j.id === photo.caption);
          return (
            <div key={photo.id} className="card overflow-hidden group">
              <div className="relative aspect-square overflow-hidden bg-navy-950">
                <img src={photo.photo_url || photo.localUrl} alt={photo.caption} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = photo.localUrl; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-transparent" />
                <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${photo.phase === 'before' ? 'bg-navy-700/90 text-navy-100' : photo.phase === 'after' ? 'bg-teal-600/90 text-white' : 'bg-navy-800/90 text-navy-200'}`}>{photo.phase || 'Photo'}</span>
                <button
                  onClick={() => removeJobPhotoLogEntry(photo.id)}
                  title="Remove photo"
                  className="absolute top-2 right-2 rounded-full bg-navy-950/80 p-1 text-navy-200 hover:text-error-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-xs font-semibold text-navy-50 truncate">{photo.caption || 'Site photo'}</p>
                  <p className="text-[10px] text-navy-400">{new Date(photo.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          );
        })}
        {logPhotos.length === 0 && <div className="col-span-full card p-8 text-center"><Camera className="w-8 h-8 text-navy-600 mx-auto mb-2" /><p className="text-sm text-navy-300">No job-site photos captured yet.</p></div>}
      </div>
    </div>
  );
}

function ReviewsPanel() {
  const { reviews, jobs, updateReviewRequest } = useData();
  const [filter, setFilter] = useState<ReviewStatus | 'all'>('all');
  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.status === filter);
  const rated = reviews.filter(r => r.rating);
  const avgRating = rated.length > 0 ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3"><div className="flex items-center gap-1.5 mb-1"><Star className="w-4 h-4 text-gold-400" /><span className="text-xs text-navy-300">Avg Rating</span></div><p className="text-base font-bold text-gold-400 font-display">{avgRating.toFixed(1)} ★</p></div>
        <div className="card p-3"><div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-4 h-4 text-success-400" /><span className="text-xs text-navy-300">Received</span></div><p className="text-base font-bold text-success-300 font-display">{reviews.filter(r => r.status === 'received').length}</p></div>
        <div className="card p-3"><div className="flex items-center gap-1.5 mb-1"><Send className="w-4 h-4 text-teal-400" /><span className="text-xs text-navy-300">Requested</span></div><p className="text-base font-bold text-teal-300 font-display">{reviews.filter(r => r.status === 'requested').length}</p></div>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${filter === 'all' ? 'bg-gold-400 text-navy-950' : 'bg-navy-800 text-navy-300 hover:bg-navy-700'}`}>All</button>
        {REVIEW_STATUSES.map(s => <button key={s.key} onClick={() => setFilter(s.key)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${filter === s.key ? 'bg-gold-400 text-navy-950' : 'bg-navy-800 text-navy-300 hover:bg-navy-700'}`}>{s.label}</button>)}
      </div>
      <div className="space-y-2">
        {filtered.map(r => {
          const statusCfg = REVIEW_STATUSES.find(s => s.key === r.status);
          const job = jobs.find(j => j.id === r.job_id);
          return (
            <div key={r.id} className="card p-3">
              <div className="flex items-start justify-between gap-2 mb-2"><div className="min-w-0"><p className="text-sm font-semibold text-navy-50 truncate">{r.customer_name}</p>{job && <p className="text-xs text-navy-300">{serviceDisplayName(job.service_key)}</p>}</div><span className={`inline-flex items-center rounded-full ${statusCfg?.bg} ${statusCfg?.color} px-2 py-0.5 text-[10px] font-bold shrink-0`}>{statusCfg?.label}</span></div>
              {r.rating !== null && <div className="flex items-center gap-0.5 mb-1.5">{Array.from({ length: 5 }, (_, i) => i + 1).map(n => <Star key={n} className={`w-3.5 h-3.5 ${n <= (r.rating || 0) ? 'text-gold-400 fill-gold-400' : 'text-navy-600'}`} />)}</div>}
              {r.review_text && <p className="text-sm text-navy-200 italic mb-2">"{r.review_text}"</p>}
              <div className="flex items-center gap-3 text-[10px] text-navy-400">{r.sent_at && <span>Sent {formatRelative(r.sent_at)}</span>}{r.responded_at && <span>Responded {formatRelative(r.responded_at)}</span>}</div>
              {r.status === 'requested' && <div className="flex items-center gap-2 mt-2 pt-2 border-t border-navy-700"><button onClick={() => updateReviewRequest(r.id, { status: 'received', rating: 5, review_text: '' })} className="text-xs font-semibold text-success-400 hover:text-success-300">Mark Received</button><button onClick={() => updateReviewRequest(r.id, { status: 'declined' })} className="text-xs font-semibold text-error-400 hover:text-error-300">Mark Declined</button></div>}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="card p-8 text-center"><Star className="w-8 h-8 text-navy-600 mx-auto mb-2" /><p className="text-sm text-navy-300">No review requests yet.</p></div>}
      </div>
    </div>
  );
}

function NotificationsPanel() {
  const { notifications, addNotification, customers } = useData();
  const [showCompose, setShowCompose] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><p className="text-sm text-navy-300">{notifications.length} notifications sent</p><button onClick={() => setShowCompose(true)} className="btn-primary text-xs py-2"><Plus className="w-3.5 h-3.5" /> Compose</button></div>
      <div className="space-y-2">
        {notifications.map(n => {
          const typeCfg = NOTIFICATION_TYPES.find(t => t.key === n.type);
          return (
            <div key={n.id} className="card p-3">
              <div className="flex items-start gap-2.5">
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${n.type === 'sms' ? 'bg-teal-900/40' : 'bg-accent-900/40'}`}>{n.type === 'sms' ? <MessageSquare className="w-4 h-4 text-teal-400" /> : <Mail className="w-4 h-4 text-accent-400" />}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-navy-50 truncate">{n.recipient_name}</p><span className="text-[10px] text-navy-400 shrink-0">{formatRelative(n.sent_at || n.created_at)}</span></div>
                  {n.subject && <p className="text-xs font-semibold text-gold-400 truncate">{n.subject}</p>}
                  <p className="text-xs text-navy-300 mt-1 line-clamp-2">{n.body}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px]"><span className={`inline-flex items-center gap-1 rounded-full ${n.type === 'sms' ? 'bg-teal-900/40 text-teal-300' : 'bg-accent-900/40 text-accent-300'} px-2 py-0.5 font-bold`}>{typeCfg?.label}</span><span className="text-navy-400">To: {n.recipient}</span></div>
                </div>
              </div>
            </div>
          );
        })}
        {notifications.length === 0 && <div className="card p-8 text-center"><Bell className="w-8 h-8 text-navy-600 mx-auto mb-2" /><p className="text-sm text-navy-300">No notifications sent yet.</p></div>}
      </div>
{showCompose && <ComposeNotificationModal customers={customers} onClose={() => setShowCompose(false)} onSend={async (notif) => { await addNotification(notif); setShowCompose(false); }} />}
    </div>
  );
}

function ComposeNotificationModal({ customers, onClose, onSend }: { customers: { id: string; name: string; phone: string; email: string }[]; onClose: () => void; onSend: (n: { type: NotificationType; recipient: string; recipient_name: string; subject: string | null; body: string; status: 'sent'; job_id: string | null }) => Promise<void> }) {
  const [type, setType] = useState<NotificationType>('sms');
  const [recipientName, setRecipientName] = useState('');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !body.trim()) { setError('Recipient and message body are required.'); return; }
    setSending(true);
    setError(null);
    try {
      await onSend({ type, recipient: recipient.trim(), recipient_name: recipientName.trim() || recipient.trim(), subject: type === 'email' ? (subject.trim() || null) : null, body: body.trim(), status: 'sent', job_id: null });
    } catch { setError('Could not send notification.'); } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="card w-full max-w-md rounded-b-none md:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold text-navy-50">Compose Notification</h3><button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button></div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {customers.length > 0 && <div><label className="label">Quick Select Customer</label><select className="input" defaultValue="" onChange={e => { const f = customers.find(c => c.id === e.target.value); if (f) { setRecipientName(f.name); setRecipient(type === 'sms' ? f.phone : f.email); } }}><option value="">Choose a customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Channel</label><select className="input" value={type} onChange={e => setType(e.target.value as NotificationType)}><option value="sms">SMS</option><option value="email">Email</option></select></div>
            <div><label className="label">Recipient Name</label><input className="input" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Customer Name" /></div>
          </div>
          <div><label className="label">{type === 'sms' ? 'Phone Number *' : 'Email Address *'}</label><input className="input" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder={type === 'sms' ? '437-440-4072' : 'customer@email.com'} /></div>
          {type === 'email' && <div><label className="label">Subject</label><input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Service Update — Masbling Astar Services" /></div>}
          <div><label className="label">Message *</label><textarea className="input min-h-[80px]" value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." /></div>
          {error && <p className="text-xs text-error-400">{error}</p>}
          <div className="flex items-center gap-2 pt-1"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={sending} className="btn-primary flex-1">{sending ? 'Sending...' : 'Send'}</button></div>
        </form>
      </div>
    </div>
  );
}

function StaffPanel() {
  const { technicians, createStaffAccount, toggleStaffActive, resetStaffPassword } = useData();
  const [showCreate, setShowCreate] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><p className="text-sm text-navy-300">{technicians.filter(t => t.active).length} active staff members</p><button onClick={() => setShowCreate(true)} className="btn-primary text-xs py-2"><Plus className="w-3.5 h-3.5" /> Add Staff</button></div>
      {resetMsg && <div className="card p-3 border border-gold-500/30 bg-gold-900/20 text-xs text-gold-300 flex items-center justify-between"><span>{resetMsg}</span><button onClick={() => setResetMsg(null)} className="btn-ghost p-1"><X className="w-3.5 h-3.5" /></button></div>}
      <div className="space-y-2">
        {technicians.map(tech => {
          const colorCls = TECHNICIAN_COLORS[tech.color || TECHNICIAN_COLOR_OPTIONS.at(0) || 'gold'] || 'bg-gold-500';
          return (
            <div key={tech.id} className={`card p-3 ${!tech.active ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-9 h-9 rounded-lg ${colorCls} flex items-center justify-center text-navy-950 font-bold text-sm shrink-0`}>{tech.name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0"><div className="flex items-center gap-1.5"><p className="text-sm font-semibold text-navy-50 truncate">{tech.name}</p><span className="inline-flex items-center gap-1 rounded-full bg-navy-700 px-2 py-0.5 text-[10px] font-bold text-gold-400 uppercase"><Shield className="w-2.5 h-2.5" /> {tech.role || 'tech'}</span></div><p className="text-xs text-navy-300 truncate">{tech.email || tech.phone || 'Staff member'}</p></div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tech.email && <button onClick={async () => { const r = await resetStaffPassword(tech.email!); setResetMsg(r.error || `Password reset link sent to ${tech.email}`); }} className="btn-ghost p-1.5 text-navy-300 hover:text-gold-400" title="Send password reset"><KeyRound className="w-4 h-4" /></button>}
                  <button onClick={() => toggleStaffActive(tech.id, !tech.active)} className={`text-xs font-semibold ${tech.active ? 'text-warning-400 hover:text-warning-300' : 'text-success-400 hover:text-success-300'}`}>{tech.active ? 'Deactivate' : 'Activate'}</button>
                </div>
              </div>
            </div>
          );
        })}
        {technicians.length === 0 && <div className="card p-8 text-center"><UserCog className="w-8 h-8 text-navy-600 mx-auto mb-2" /><p className="text-sm text-navy-300">No staff accounts configured yet.</p></div>}
      </div>
      {showCreate && <CreateStaffModal onClose={() => setShowCreate(false)} onCreate={async (staff) => { await createStaffAccount(staff); setShowCreate(false); }} />}
    </div>
  );
}

function CreateStaffModal({ onClose, onCreate }: { onClose: () => void; onCreate: (staff: { name: string; email: string; password: string; role?: string; phone?: string; color?: string }) => Promise<void> }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('tech');
  const [color, setColor] = useState(TECHNICIAN_COLOR_OPTIONS.at(0) || 'gold');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) { setError('Name, email, and password are required.'); return; }
    if (!isPasswordStrong(password)) { setError('Please choose a stronger password (at least 8 characters with uppercase, lowercase, and numbers).'); return; }
    setSaving(true);
    setError(null);
    try { await onCreate({ name: name.trim(), email: email.trim(), password, role, phone: phone.trim(), color }); } catch (err) { setError(err instanceof Error ? err.message : 'Could not create staff account.'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="card w-full max-w-md rounded-b-none md:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold text-navy-50">Add Staff Account</h3><button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button></div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="label">Full Name *</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Mark Simms" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Email *</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@masblingastarservices.com" /></div><div><label className="label">Phone</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="437-440-4072" /></div></div>
          <div><label className="label flex items-center gap-1"><Lock className="w-3 h-3" /> Password *</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" /></div>

<div className="grid grid-cols-2 gap-3"><div><label className="label">Role</label><select className="input" value={role} onChange={e => setRole(e.target.value)}><option value="admin">Admin</option><option value="tech">Technician</option></select></div><div><label className="label">Badge Color</label><select className="input" value={color} onChange={e => setColor(e.target.value)}>{TECHNICIAN_COLOR_OPTIONS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}</select></div></div>
          {error && <p className="text-xs text-error-400">{error}</p>}
          <div className="flex items-center gap-2 pt-1"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating...' : 'Create Staff'}</button></div>
        </form>
      </div>
    </div>
  );
}

function DeletionRequestsPanel() {
  const { deletionRequests, updateDeletionRequest } = useData();
  const [selected, setSelected] = useState<DataDeletionRequest | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><p className="text-sm text-navy-300">{deletionRequests.length} data deletion requests</p></div>
      <div className="space-y-2">
        {deletionRequests.map(r => (
          <div key={r.id} className="card p-3">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-sm font-semibold text-navy-50 truncate">{r.name}</p><p className="text-xs text-navy-300 truncate">{r.email}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-navy-700 px-2 py-0.5 text-[10px] font-bold text-gold-400 uppercase shrink-0">{r.status === 'pending' ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{r.status.replace('_', ' ')}</span></div>
            {r.account_identifier && <p className="text-xs text-navy-300">Account: {r.account_identifier}</p>}
            {r.reason && <p className="text-xs text-navy-300 italic mt-1">"{r.reason}"</p>}
            <div className="flex items-center gap-3 text-[10px] text-navy-400 mt-2"><span>Submitted {formatRelative(r.submitted_at)}</span>{r.resolved_at && <span>Resolved {formatRelative(r.resolved_at)}</span>}</div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-navy-700">
              <button onClick={() => setSelected(r)} className="text-xs font-semibold text-gold-400 hover:text-gold-300">Manage</button>
              {r.status === 'pending' && <button onClick={() => updateDeletionRequest(r.id, { status: 'in_progress' })} className="text-xs font-semibold text-teal-400 hover:text-teal-300">Start Processing</button>}
              {r.status === 'in_progress' && <><button onClick={() => updateDeletionRequest(r.id, { status: 'completed' })} className="text-xs font-semibold text-success-400 hover:text-success-300">Mark Completed</button><button onClick={() => updateDeletionRequest(r.id, { status: 'declined' })} className="text-xs font-semibold text-error-400 hover:text-error-300">Decline</button></>}
            </div>
          </div>
        ))}
        {deletionRequests.length === 0 && <div className="card p-8 text-center"><ShieldCheck className="w-8 h-8 text-navy-600 mx-auto mb-2" /><p className="text-sm text-navy-300">No data deletion requests.</p></div>}
      </div>
      {selected && <DeletionDetailModal request={selected} onClose={() => setSelected(null)} onUpdate={async (id, updates) => { await updateDeletionRequest(id, updates); setSelected(null); }} />}
    </div>
  );
}

function DeletionDetailModal({ request, onClose, onUpdate }: { request: DataDeletionRequest; onClose: () => void; onUpdate: (id: string, updates: Partial<Pick<DataDeletionRequest, 'status' | 'staff_notes' | 'resolved_at'>>) => Promise<void> }) {
  const [status, setStatus] = useState<DeletionRequestStatus>(request.status);
  const [notes, setNotes] = useState(request.staff_notes || '');
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="card w-full max-w-md rounded-b-none md:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-base font-bold text-navy-50">Manage Deletion Request</h3><button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button></div>
        <div className="space-y-3">
          <div className="card p-3 bg-navy-900"><p className="text-xs font-semibold text-navy-200 mb-1">Requester</p><p className="text-sm text-navy-50">{request.name}</p><p className="text-xs text-navy-300">{request.email}</p>{request.phone && <p className="text-xs text-navy-300">{request.phone}</p>}{request.account_identifier && <p className="text-xs text-navy-300 mt-1">Account: {request.account_identifier}</p>}{request.reason && <p className="text-xs text-navy-300 italic mt-2">"{request.reason}"</p>}</div>
          <div><label className="label">Status</label><select className="input" value={status} onChange={e => setStatus(e.target.value as DeletionRequestStatus)}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="declined">Declined</option></select></div>
          <div><label className="label">Staff Notes</label><textarea className="input min-h-[80px]" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes about this request..." /></div>
          <div className="flex items-center gap-2 pt-1"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="button" disabled={saving} onClick={async () => { setSaving(true); try { await onUpdate(request.id, { status, staff_notes: notes.trim() || null }); } finally { setSaving(false); } }} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Changes'}</button></div>
        </div>
      </div>
    </div>
  );
}

