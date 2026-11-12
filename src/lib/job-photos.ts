import { supabase } from './supabase';

const JOB_PHOTO_BUCKET = 'job-photos';

export async function uploadJobPhoto(jobId: string, image: Blob): Promise<string> {
  const path = `${jobId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const { error } = await supabase.storage
    .from(JOB_PHOTO_BUCKET)
    .upload(path, image, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw error;

  const { data } = supabase.storage.from(JOB_PHOTO_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error('Photo URL could not be created');
  return data.publicUrl;
}
