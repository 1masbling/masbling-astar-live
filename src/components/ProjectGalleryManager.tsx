import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Images, Loader2, Plus, Share2, Star, Trash2, X } from 'lucide-react';
import { deleteProjectPhoto, fetchProjectPhotos, setProjectFeatured, type ProjectPhoto } from '@/lib/project-photos';
import { fetchPhotoBlob, shareOrDownloadZip, type BundledPhoto } from '@/lib/photo-bundle';
import ProjectPhotoForm from '@/components/ProjectPhotoForm';

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function projectSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
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

interface ProjectCardProps {
  project: ProjectPhoto;
  deleting: boolean;
  confirming: boolean;
  toggling: boolean;
  saving: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onToggleFeatured: () => void;
  onSavePhotos: () => void;
}

function ProjectCard({
  project, deleting, confirming, toggling, saving,
  onAskDelete, onCancelDelete, onConfirmDelete, onToggleFeatured, onSavePhotos,
}: ProjectCardProps) {
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-2 gap-2 p-2">
        <PhotoThumb url={project.beforeUrl} label="Before" />
        <PhotoThumb url={project.afterUrl} label="After" />
      </div>
      <div className="px-3 pb-3">
        <p className="text-sm font-semibold text-navy-50 truncate">{project.title}</p>
        <p className="text-xs text-navy-300 truncate">{project.serviceLabel} · {project.city}</p>
        <p className="text-[10px] text-navy-400 mt-0.5">{formatDate(project.createdAt)}</p>
        <div className="mt-2 pt-2 border-t border-navy-700 min-h-[32px]">
          {confirming ? (
            <div className="flex items-center justify-end gap-3">
              <button onClick={onCancelDelete} disabled={deleting} className="text-xs font-semibold text-navy-300 hover:text-navy-100 disabled:opacity-50">Cancel</button>
              <button onClick={onConfirmDelete} disabled={deleting} className="inline-flex items-center gap-1 text-xs font-semibold text-error-400 hover:text-error-300 disabled:opacity-50">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete from website
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={onSavePhotos}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-teal-300 hover:text-teal-200 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />} Save / Share
              </button>
              <button
                onClick={onToggleFeatured}
                disabled={toggling}
                aria-pressed={project.featured}
                className={`inline-flex items-center justify-center gap-1 text-xs font-semibold transition-colors disabled:opacity-50 ${project.featured ? 'text-gold-300' : 'text-navy-300 hover:text-gold-300'}`}
              >
                {toggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className={`w-3.5 h-3.5 ${project.featured ? 'fill-current' : ''}`} />}
                {project.featured ? 'In hero' : 'Show in hero'}
              </button>
              <button onClick={onAskDelete} className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-navy-300 hover:text-error-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
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
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const handleToggleFeatured = async (project: ProjectPhoto) => {
    const featured = !project.featured;
    setTogglingId(project.id);
    setActionError(null);
    try {
      await setProjectFeatured(project.id, featured);
      setProjects(prev => prev?.map(p => (p.id === project.id ? { ...p, featured } : p)) ?? prev);
    } catch (err) {
      console.error('Updating hero feature failed:', err);
      setActionError('That photo could not be updated for the homepage hero. Please try again.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSavePhotos = async (project: ProjectPhoto) => {
    setSavingId(project.id);
    setActionError(null);
    try {
      const slug = projectSlug(project.title);
      const sources = [
        project.beforeUrl && { name: `masbling-astar-${slug}-before.jpg`, url: project.beforeUrl },
        project.afterUrl && { name: `masbling-astar-${slug}-after.jpg`, url: project.afterUrl },
      ].filter((s): s is { name: string; url: string } => Boolean(s));
      const photos: BundledPhoto[] = await Promise.all(
        sources.map(async s => ({ name: s.name, blob: await fetchPhotoBlob(s.url) })),
      );
      await shareOrDownloadZip(photos, `masbling-astar-${slug}.zip`);
    } catch (err) {
      console.error('Saving project photos failed:', err);
      setActionError('Those photos could not be saved or shared. Please try again.');
    } finally {
      setSavingId(null);
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
              toggling={togglingId === project.id}
              saving={savingId === project.id}
              onAskDelete={() => setConfirmingId(project.id)}
              onCancelDelete={() => setConfirmingId(null)}
              onConfirmDelete={() => handleDelete(project)}
              onToggleFeatured={() => handleToggleFeatured(project)}
              onSavePhotos={() => handleSavePhotos(project)}
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
