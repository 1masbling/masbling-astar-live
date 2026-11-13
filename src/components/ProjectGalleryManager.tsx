import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Images, Loader2, Plus, Trash2, X } from 'lucide-react';
import { deleteProjectPhoto, fetchProjectPhotos, type ProjectPhoto } from '@/lib/project-photos';
import ProjectPhotoForm from '@/components/ProjectPhotoForm';

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PhotoThumb({ url, label }: { url: string | null; label: string }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-navy-950">
      {url ? (
        <img src={url} alt={`${label} photo`} loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-navy-500">No {label.toLowerCase()} photo</div>
      )}
      <span className="absolute bottom-1 left-1 rounded bg-navy-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-navy-100">{label}</span>
    </div>
  );
}

function ProjectCard({ project, deleting, confirming, onAskDelete, onCancelDelete, onConfirmDelete }: {
  project: ProjectPhoto;
  deleting: boolean;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-2 gap-2 p-2">
        <PhotoThumb url={project.beforeUrl} label="Before" />
        <PhotoThumb url={project.afterUrl} label="After" />
      </div>
      <div className="px-3 pb-3">
        <p className="text-sm font-semibold text-navy-50 truncate">{project.title}</p>
        <p className="text-xs text-navy-300 truncate">{project.serviceLabel} · {project.city}</p>
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-navy-700 min-h-[32px]">
          <span className="text-[10px] text-navy-400">{formatDate(project.createdAt)}</span>
          {confirming ? (
            <div className="flex items-center gap-3">
              <button onClick={onCancelDelete} disabled={deleting} className="text-xs font-semibold text-navy-300 hover:text-navy-100 disabled:opacity-50">Cancel</button>
              <button onClick={onConfirmDelete} disabled={deleting} className="inline-flex items-center gap-1 text-xs font-semibold text-error-400 hover:text-error-300 disabled:opacity-50">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete from website
              </button>
            </div>
          ) : (
            <button onClick={onAskDelete} className="inline-flex items-center gap-1 text-xs font-semibold text-navy-300 hover:text-error-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectGalleryManager() {
  const [projects, setProjects] = useState<ProjectPhoto[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProjects(await fetchProjectPhotos());
      setLoadError(null);
    } catch (err) {
      console.error('Loading project photos failed:', err);
      setLoadError('Projects could not be loaded. Please try again.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (project: ProjectPhoto) => {
    setDeletingId(project.id);
    setActionError(null);
    try {
      await deleteProjectPhoto(project);
      setProjects(prev => prev?.filter(p => p.id !== project.id) ?? prev);
    } catch (err) {
      console.error('Deleting project photo failed:', err);
      setActionError('That project could not be fully deleted. The list has been refreshed.');
      await load();
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-teal-900/40"><Images className="w-5 h-5 text-teal-400" /></div>
          <div>
            <p className="text-sm font-semibold text-navy-50">Before & After Gallery</p>
            <p className="text-xs text-navy-300">
              {projects ? `${projects.length} live on the Recent Projects section` : 'Loading live projects...'}
            </p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-xs py-2">
          <Plus className="w-3.5 h-3.5" /> Add Before & After
        </button>
      </div>

      {actionError && (
        <div className="rounded-lg bg-error-900/40 border border-error-700/40 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-error-400 mt-0.5 shrink-0" />
          <p className="text-xs text-error-300">{actionError}</p>
        </div>
      )}

      {loadError ? (
        <div className="card p-6 text-center space-y-3">
          <p className="text-sm text-navy-300">{loadError}</p>
          <button onClick={load} className="btn-secondary text-xs py-2">Try again</button>
        </div>
      ) : projects === null ? (
        <div className="card p-8 flex justify-center"><Loader2 className="w-6 h-6 text-gold-400 animate-spin" /></div>
      ) : projects.length === 0 ? (
        <div className="card p-8 text-center">
          <Images className="w-8 h-8 text-navy-600 mx-auto mb-2" />
          <p className="text-sm text-navy-300">No projects on the website yet.</p>
          <p className="text-xs text-navy-500 mt-1">Add a before and after pair to publish it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              deleting={deletingId === project.id}
              confirming={confirmingId === project.id}
              onAskDelete={() => setConfirmingId(project.id)}
              onCancelDelete={() => setConfirmingId(null)}
              onConfirmDelete={() => handleDelete(project)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy-950/80 backdrop-blur-sm p-0 md:p-4" onClick={() => setShowAdd(false)}>
          <div className="card w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-b-none md:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-navy-50">New Before & After</h3>
              <button onClick={() => setShowAdd(false)} className="btn-ghost p-1.5" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <ProjectPhotoForm
              mode="pair"
              onSaved={() => {
                setShowAdd(false);
                load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
