import { supabase } from './supabase';

const JOB_PHOTO_BUCKET = 'job-photos';

export interface UploadedPhoto {
  url: string;
  path: string;
}

async function uploadWatermarkedJpeg(folder: string, image: Blob): Promise<UploadedPhoto> {
  const isVideo = image.type.startsWith('video/');
  const sub = image.type.split('/')[1]?.toLowerCase() || (isVideo ? 'mp4' : 'jpeg');
  const ext = isVideo ? (sub === 'quicktime' ? 'mov' : sub) : sub === 'jpeg' ? 'jpg' : sub;
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabase.storage
    .from(JOB_PHOTO_BUCKET)
    .upload(path, image, { contentType: image.type || (isVideo ? 'video/mp4' : 'image/jpeg'), cacheControl: '31536000' });
  if (error) throw error;

  const { data } = supabase.storage.from(JOB_PHOTO_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error('Photo URL could not be created');
  return { url: data.publicUrl, path };
}

export async function uploadJobPhoto(jobId: string, image: Blob): Promise<string> {
  const uploaded = await uploadWatermarkedJpeg(jobId, image);
  return uploaded.url;
}

export function uploadProjectPhoto(image: Blob): Promise<UploadedPhoto> {
  return uploadWatermarkedJpeg('projects', image);
}

export async function removeJobPhotoFiles(paths: string[]): Promise<void> {
  const { error } = await supabase.storage.from(JOB_PHOTO_BUCKET).remove(paths);
  if (error) throw error;
}
