import { supabase } from './supabase';
import { removeJobPhotoFiles, uploadProjectPhoto, type UploadedPhoto } from './job-photos';

export const PROJECT_CITIES = ['Brampton', 'Mississauga', 'Toronto', 'Oakville', 'Milton', 'Vaughan'];

export interface ProjectDetails {
  title: string;
  serviceLabel: string;
  city: string;
}

export interface ProjectPhoto {
  id: string;
  title: string;
  serviceLabel: string;
  city: string;
  beforeUrl: string | null;
  beforePath: string | null;
  afterUrl: string | null;
  afterPath: string | null;
  createdAt: string;
}

const PROJECT_COLUMNS = 'id, title, service_label, city, before_url, before_path, after_url, after_path, created_at';

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function toProjectPhoto(row: unknown): ProjectPhoto | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.title !== 'string' || typeof r.service_label !== 'string' || typeof r.city !== 'string') {
    return null;
  }
  const beforeUrl = optionalText(r.before_url);
  const afterUrl = optionalText(r.after_url);
  if (!beforeUrl && !afterUrl) return null;
  return {
    id: r.id,
    title: r.title,
    serviceLabel: r.service_label,
    city: r.city,
    beforeUrl,
    beforePath: optionalText(r.before_path),
    afterUrl,
    afterPath: optionalText(r.after_path),
    createdAt: typeof r.created_at === 'string' ? r.created_at : '',
  };
}

export async function fetchProjectPhotos(): Promise<ProjectPhoto[]> {
  const { data, error } = await supabase
    .from('project_photos')
    .select(PROJECT_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Project photos response was not a list');
  return data.flatMap(row => {
    const project = toProjectPhoto(row);
    return project ? [project] : [];
  });
}

export async function saveProjectPhoto(
  details: ProjectDetails,
  photos: { before?: Blob; after?: Blob },
): Promise<void> {
  const uploaded: UploadedPhoto[] = [];
  try {
    const before = photos.before ? await uploadProjectPhoto(photos.before) : null;
    if (before) uploaded.push(before);
    const after = photos.after ? await uploadProjectPhoto(photos.after) : null;
    if (after) uploaded.push(after);

    const { error } = await supabase.from('project_photos').insert({
      title: details.title,
      service_label: details.serviceLabel,
      city: details.city,
      before_url: before?.url ?? null,
      before_path: before?.path ?? null,
      after_url: after?.url ?? null,
      after_path: after?.path ?? null,
    });
    if (error) throw error;
  } catch (err) {
    if (uploaded.length > 0) {
      await removeJobPhotoFiles(uploaded.map(p => p.path)).catch(cleanupErr =>
        console.error('Orphaned project photo cleanup failed:', cleanupErr),
      );
    }
    throw err;
  }
}

export async function deleteProjectPhoto(project: ProjectPhoto): Promise<void> {
  const { error } = await supabase.from('project_photos').delete().eq('id', project.id);
  if (error) throw error;

  const paths = [project.beforePath, project.afterPath].filter((p): p is string => p !== null);
  if (paths.length > 0) await removeJobPhotoFiles(paths);
}
