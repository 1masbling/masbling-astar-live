import { supabase } from '@/lib/supabase';

const BUCKET = 'calculator-uploads';
const MAX_FILES = 10;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'];

export const PROJECT_MEDIA_ACCEPT = 'image/jpeg,image/png,video/mp4,video/quicktime,.jpg,.jpeg,.png,.mp4,.mov';

export interface ProjectMediaRef {
  path: string;
  name: string;
  type: string;
  size: number;
}

export function validateProjectFiles(files: File[]): string | null {
  if (files.length > MAX_FILES) return `You can attach up to ${MAX_FILES} files.`;
  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) return `${file.name} is not a supported file type. Use JPEG, PNG, MP4 or MOV.`;
    if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than 100 MB.`;
  }
  return null;
}

function safeFileName(name: string) {
  return name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120) || 'file';
}

export async function uploadProjectFiles(files: File[]): Promise<ProjectMediaRef[]> {
  const folder = crypto.randomUUID();
  const media: ProjectMediaRef[] = [];

  for (const [index, file] of files.entries()) {
    const path = `${folder}/${index}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
    if (error) throw new Error(`Could not upload ${file.name}.`);
    media.push({ path, name: file.name, type: file.type, size: file.size });
  }

  return media;
}
