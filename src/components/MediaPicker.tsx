import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Trash2, Copy, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadMedia, listMyMedia, deleteMedia, type UploadedMedia } from '@/lib/mediaUpload';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick?: (m: UploadedMedia) => void;
}

const MediaPicker = ({ open, onClose, onPick }: Props) => {
  const [items, setItems] = useState<UploadedMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => { setLoading(true); try { setItems(await listMyMedia()); } finally { setLoading(false); } };
  useEffect(() => { if (open) refresh(); }, [open]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const m = await uploadMedia(f);
        toast.success(`Uploaded ${m.name}`);
      }
      await refresh();
    } catch (e: any) { toast.error(e?.message || 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleDelete = async (m: UploadedMedia) => {
    if (!confirm(`Delete ${m.name}?`)) return;
    try { await deleteMedia(m.path); await refresh(); toast.success('Deleted'); }
    catch (e: any) { toast.error(e?.message || 'Delete failed'); }
  };

  const handlePick = (m: UploadedMedia) => {
    if (onPick) onPick(m);
    else { navigator.clipboard.writeText(m.url); toast.success('URL copied'); }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Media library</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <input ref={fileRef} type="file" multiple accept="image/*,video/*"
            onChange={(e) => handleFiles(e.target.files)} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg gradient-gold text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Uploading…' : 'Upload media'}
          </button>
          <span className="text-xs text-muted-foreground">Images & videos · max 25MB</span>
        </div>

        <div className="overflow-y-auto pt-3">
          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No media yet. Upload images or videos to use in your generated sites.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map(m => {
                const isVideo = m.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(m.name);
                return (
                  <div key={m.path} className="group relative rounded-lg overflow-hidden border border-border bg-secondary aspect-square">
                    {isVideo ? (
                      <video src={m.url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={m.url} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { navigator.clipboard.writeText(m.url); toast.success('URL copied'); }}
                          className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white" title="Copy URL">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(m)} className="p-1.5 rounded bg-destructive/80 hover:bg-destructive text-white" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <button onClick={() => handlePick(m)}
                        className="w-full px-2 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium">
                        {onPick ? 'Use this' : 'Copy URL'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPicker;
