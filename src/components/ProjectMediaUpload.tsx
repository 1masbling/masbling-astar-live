import { useState, type ChangeEvent } from 'react';
import { CheckCircle2, Image as ImageIcon, Upload, Video, X, AlertCircle } from 'lucide-react';
import { PROJECT_MEDIA_ACCEPT, validateProjectFiles } from '@/lib/project-media';

interface ProjectMediaUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

export default function ProjectMediaUpload({ files, onFilesChange, disabled = false }: ProjectMediaUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (selected.length === 0) return;
    const problem = validateProjectFiles([...files, ...selected]);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onFilesChange([...files, ...selected]);
  };

  const removeFile = (index: number) => {
    setError(null);
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gold-400/10 border border-gold-600/20">
          <Upload className="w-4 h-4 text-gold-400" />
        </div>
        <div>
          <h3 className="font-display text-sm font-bold text-navy-50">Upload a Video or Picture of Your Project Area</h3>
          <p className="text-[11px] text-navy-400">Optional — MP4, MOV, JPEG, PNG up to 100MB</p>
        </div>
      </div>
      <div className={`relative border-2 border-dashed border-navy-600 rounded-2xl bg-navy-900/40 transition-colors group ${disabled ? 'opacity-50' : 'hover:border-gold-500/50'}`}>
        <input
          type="file"
          accept={PROJECT_MEDIA_ACCEPT}
          capture="environment"
          multiple
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          onChange={handleChange}
        />
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center pointer-events-none">
          <Upload className="w-7 h-7 text-navy-500 group-hover:text-gold-400 transition-colors mb-2.5" />
          <p className="text-xs text-navy-300 font-medium">Tap to take a photo or choose files</p>
          <p className="text-[11px] text-navy-500 mt-1">MP4, MOV, JPEG, PNG — up to 100MB per file</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-navy-400 bg-navy-800/60 border border-navy-700 rounded-full px-2.5 py-1">
              <Video className="w-3 h-3" /> MP4 · MOV
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-navy-400 bg-navy-800/60 border border-navy-700 rounded-full px-2.5 py-1">
              <ImageIcon className="w-3 h-3" /> JPEG · PNG
            </span>
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-3 flex items-center gap-2 text-xs text-error-300 bg-error-900/20 border border-error-700/50 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 text-xs text-success-300 bg-success-900/20 border border-success-700/50 rounded-lg px-4 py-2.5 animate-fade-in"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="flex-1 min-w-0 truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                className="shrink-0 rounded-md p-1 text-navy-300 hover:text-navy-50 hover:bg-navy-800 transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
