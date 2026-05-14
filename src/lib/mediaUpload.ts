import { supabase } from '@/integrations/supabase/client';

export interface UploadedMedia {
  url: string;
  path: string;
  name: string;
  type: string;
  size: number;
}

export async function uploadMedia(file: File): Promise<UploadedMedia> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to upload media');
  if (file.size > 25 * 1024 * 1024) throw new Error('File too large (max 25MB)');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;

  const { error } = await supabase.storage.from('project-media').upload(path, file, {
    cacheControl: '31536000', upsert: false, contentType: file.type || undefined,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('project-media').getPublicUrl(path);
  return { url: data.publicUrl, path, name: file.name, type: file.type || ext, size: file.size };
}

export async function listMyMedia(): Promise<UploadedMedia[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.storage.from('project-media').list(user.id, {
    limit: 100, sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error || !data) return [];
  return data.filter(o => o.name).map(o => {
    const path = `${user.id}/${o.name}`;
    const { data: pub } = supabase.storage.from('project-media').getPublicUrl(path);
    return {
      url: pub.publicUrl, path, name: o.name,
      type: (o.metadata as any)?.mimetype || '', size: (o.metadata as any)?.size || 0,
    };
  });
}

export async function deleteMedia(path: string) {
  const { error } = await supabase.storage.from('project-media').remove([path]);
  if (error) throw error;
}
