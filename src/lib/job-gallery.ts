import { supabase } from './supabase';

export interface PublicJobGalleryItem {
  jobId: string;
  serviceLabel: string;
  completedOn: string | null;
  beforeUrl: string;
  afterUrl: string;
}

interface GalleryRow {
  job_id: unknown;
  service_label: unknown;
  completed_on: unknown;
  before_url: unknown;
  after_url: unknown;
}

function isGalleryRow(row: unknown): row is GalleryRow {
  return typeof row === 'object' && row !== null;
}

export async function fetchPublicJobGallery(): Promise<PublicJobGalleryItem[]> {
  const { data, error } = await supabase.rpc('public_job_gallery');
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Gallery response was not a list');

  return data.filter(isGalleryRow).flatMap((row): PublicJobGalleryItem[] => {
    if (
      typeof row.job_id !== 'string' ||
      typeof row.service_label !== 'string' ||
      typeof row.before_url !== 'string' ||
      typeof row.after_url !== 'string'
    ) {
      return [];
    }
    return [{
      jobId: row.job_id,
      serviceLabel: row.service_label,
      completedOn: typeof row.completed_on === 'string' ? row.completed_on : null,
      beforeUrl: row.before_url,
      afterUrl: row.after_url,
    }];
  });
}
