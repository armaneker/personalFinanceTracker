'use client';

import { useCallback, useState, useRef, DragEvent, ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

type DropZoneState = 'idle' | 'dragover' | 'uploading' | 'success' | 'error';

interface DropZoneProps {
  onFileSelect: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

export function DropZone({
  onFileSelect,
  accept = 'application/pdf',
  maxSizeMB = 10,
  className
}: DropZoneProps) {
  const [state, setState] = useState<DropZoneState>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (accept && !accept.split(',').some(type => {
      const trimmed = type.trim();
      if (trimmed.startsWith('.')) {
        return file.name.toLowerCase().endsWith(trimmed);
      }
      return file.type === trimmed || file.type.startsWith(trimmed.replace('/*', '/'));
    })) {
      return 'Invalid file type. Please upload a PDF file.';
    }

    // Check file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File too large. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  }, [accept, maxSizeMB]);

  const processFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setState('error');
      setError(validationError);
      return;
    }

    setState('uploading');
    setFileName(file.name);
    setFileSize(file.size);
    setError(null);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 100);

    try {
      await onFileSelect(file);
      clearInterval(progressInterval);
      setProgress(100);
      setState('success');
    } catch (err) {
      clearInterval(progressInterval);
      setState('error');
      setError((err as Error).message);
      setProgress(0);
    }
  }, [onFileSelect, validateFile]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (state !== 'uploading') {
      setState('dragover');
    }
  }, [state]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (state === 'dragover') {
      setState('idle');
    }
  }, [state]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    if (state !== 'uploading') {
      inputRef.current?.click();
    }
  }, [state]);

  const handleReset = useCallback(() => {
    setState('idle');
    setFileName(null);
    setFileSize(null);
    setError(null);
    setProgress(0);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer',
          state === 'idle' && 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100',
          state === 'dragover' && 'border-blue-500 bg-blue-50 scale-[1.02]',
          state === 'uploading' && 'border-blue-400 bg-blue-50 cursor-wait',
          state === 'success' && 'border-emerald-500 bg-emerald-50',
          state === 'error' && 'border-red-400 bg-red-50'
        )}
      >
        {/* Icon */}
        <div className={cn(
          'mb-4 rounded-full p-4 transition-colors',
          state === 'idle' && 'bg-slate-200 text-slate-500',
          state === 'dragover' && 'bg-blue-200 text-blue-600',
          state === 'uploading' && 'bg-blue-200 text-blue-600',
          state === 'success' && 'bg-emerald-200 text-emerald-600',
          state === 'error' && 'bg-red-200 text-red-600'
        )}>
          {state === 'success' ? (
            <CheckIcon className="h-8 w-8" />
          ) : state === 'error' ? (
            <XIcon className="h-8 w-8" />
          ) : (
            <UploadIcon className="h-8 w-8" />
          )}
        </div>

        {/* Text content */}
        {state === 'idle' && (
          <>
            <p className="text-base font-medium text-slate-700">
              Drag PDF statement here
            </p>
            <p className="mt-1 text-sm text-slate-500">
              or click to browse
            </p>
            <p className="mt-3 text-xs text-slate-400">
              PDF statements from Turkish banks (max {maxSizeMB}MB)
            </p>
          </>
        )}

        {state === 'dragover' && (
          <>
            <p className="text-base font-medium text-blue-700">
              Drop your file here
            </p>
            <p className="mt-1 text-sm text-blue-500">
              Release to upload
            </p>
          </>
        )}

        {state === 'uploading' && (
          <>
            <p className="text-base font-medium text-blue-700">
              Processing...
            </p>
            <p className="mt-1 text-sm text-blue-500">
              {fileName}
            </p>
            {/* Progress bar */}
            <div className="mt-4 w-full max-w-xs">
              <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-blue-600">{progress}%</p>
            </div>
          </>
        )}

        {state === 'success' && (
          <>
            <p className="text-base font-medium text-emerald-700">
              File ready
            </p>
            <p className="mt-1 text-sm text-emerald-600">
              {fileName} ({fileSize ? formatFileSize(fileSize) : ''})
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="mt-3 text-xs text-emerald-700 underline hover:text-emerald-800"
            >
              Choose a different file
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <p className="text-base font-medium text-red-700">
              Upload failed
            </p>
            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="mt-3 text-xs text-red-700 underline hover:text-red-800"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
