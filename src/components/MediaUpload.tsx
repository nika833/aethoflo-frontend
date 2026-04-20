import React, { useRef, useState, useCallback } from 'react';
import { Spinner } from './ui';

interface MediaFile {
  id?: string;
  name: string;
  mime_type: string;
  size: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress?: number;
  error?: string;
  url?: string;
}

const ACCEPT = [
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',');

function fileIcon(mime: string) {
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime === 'application/pdf') return '📄';
  if (mime.includes('word')) return '📝';
  return '📎';
}

function fileTypeLabel(mime: string) {
  if (mime.startsWith('video/')) return 'Video';
  if (mime.startsWith('audio/')) return 'Audio';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.includes('word')) return 'Word doc';
  return 'File';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaUpload({ moduleId, existingMedia = [], onUploaded }: {
  moduleId: string;
  existingMedia?: { id: string; title: string | null; url: string; mime_type: string; file_size_bytes?: number }[];
  onUploaded?: () => void;
}) {
  const [files, setFiles] = useState<MediaFile[]>(() =>
    existingMedia.map((m) => ({
      id: m.id,
      name: m.title || m.url.split('/').pop() || 'file',
      mime_type: m.mime_type,
      size: m.file_size_bytes ?? 0,
      status: 'done' as const,
      url: m.url,
    }))
  );
  const [dragging, setDragging] = useState(false);
  const [recording, setRecording] = useState<'idle' | 'audio' | 'video'>('idle');
  const [recSeconds, setRecSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunks = useRef<Blob[]>([]);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    const entry: MediaFile = { name: file.name, mime_type: file.type, size: file.size, status: 'uploading', progress: 0 };
    setFiles((f) => [...f, entry]);

    const updateProgress = (pct: number) =>
      setFiles((f) => f.map((x) => x.name === entry.name && x.status === 'uploading' ? { ...x, progress: pct } : x));

    try {
      const base = import.meta.env.VITE_API_URL ?? '';
      const token = localStorage.getItem('aethoflo_token');
      const auth: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // Step 1: get R2 presigned URL (bypasses Railway 25 MB gateway)
      const presignRes = await fetch(`${base}/api/analyze/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ filename: file.name, mime_type: file.type }),
      });
      if (!presignRes.ok) {
        const e = await presignRes.json().catch(() => ({}));
        throw new Error(e.error ?? 'Could not get upload URL');
      }
      const { url, key } = await presignRes.json() as { url: string; key: string };

      // Step 2: upload directly to R2 with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) updateProgress(Math.round((e.loaded / e.total) * 88));
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText || 'check R2 CORS policy'}`));
        xhr.onerror = () => reject(new Error('Upload blocked — check R2 CORS policy allows PUT from this origin'));
        xhr.send(file);
      });

      updateProgress(92);

      // Step 3: copy R2 → S3, register in DB
      const regRes = await fetch(`${base}/api/analyze/register-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({ r2Key: key, moduleId, originalName: file.name, mimeType: file.type }),
      });
      if (!regRes.ok) {
        const e = await regRes.json().catch(() => ({}));
        throw new Error(e.error ?? 'Failed to register media');
      }
      const registered = await regRes.json();

      setFiles((f) => f.map((x) =>
        x.name === entry.name && x.status === 'uploading'
          ? { ...x, status: 'done', id: registered.id, url: registered.url, progress: 100 }
          : x
      ));
      onUploaded?.();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? 'Upload failed';
      setFiles((f) => f.map((x) =>
        x.name === entry.name && x.status === 'uploading' ? { ...x, status: 'error', error: msg } : x
      ));
    }
  }, [moduleId]);

  const handleFiles = (incoming: FileList | File[]) => Array.from(incoming).forEach(uploadFile);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const removeFile = async (f: MediaFile) => {
    if (f.id) {
      const base = import.meta.env.VITE_API_URL ?? '';
      const token = localStorage.getItem('aethoflo_token');
      try {
        await fetch(`${base}/api/media/${f.id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch {}
    }
    setFiles((prev) => prev.filter((x) => x !== f));
  };

  const startRecording = async (mode: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        mode === 'video' ? { video: true, audio: true } : { audio: true }
      );
      recChunks.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) recChunks.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = mode === 'video' ? 'video/webm' : 'audio/webm';
        const blob = new Blob(recChunks.current, { type: mime });
        const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        uploadFile(new File([blob], `recording-${ts}.webm`, { type: mime }));
        setRecording('idle'); setRecSeconds(0);
        if (recTimer.current) clearInterval(recTimer.current);
      };
      mr.start();
      setRecording(mode); setRecSeconds(0);
      recTimer.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      alert('Could not access microphone/camera. Check browser permissions.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recTimer.current) clearInterval(recTimer.current);
  };

  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '28px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--accent-light)' : 'var(--surface-2)',
          transition: 'all 150ms',
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>☁️</div>
        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 14, marginBottom: 4 }}>
          Drop files here or click to browse
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Video · Audio · PDF · Word doc — multiple files allowed
        </div>
        <input ref={fileInputRef} type="file" multiple accept={ACCEPT} style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      </div>

      {/* Record buttons */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Record:</span>
        {recording === 'idle' ? (
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => startRecording('audio')} style={{ gap: 6 }}>🎙 Audio</button>
            <button className="btn btn-secondary btn-sm" onClick={() => startRecording('video')} style={{ gap: 6 }}>📹 Video</button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#DC2626', fontWeight: 600, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', animation: 'pulse-soft 1s infinite' }} />
              {recording === 'video' ? '📹' : '🎙'} {fmtTime(recSeconds)}
            </span>
            <button className="btn btn-danger btn-sm" onClick={stopRecording}>⏹ Stop & upload</button>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${f.status === 'error' ? '#FCA5A5' : 'var(--border-light)'}`,
              flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <span style={{ fontSize: 20 }}>{fileIcon(f.mime_type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    {fileTypeLabel(f.mime_type)} · {formatBytes(f.size)}
                  </div>
                </div>
                {f.status === 'uploading' && <Spinner size={16} />}
                {f.status === 'done' && <span style={{ color: '#2E7D52', fontSize: 16 }}>✓</span>}
                {f.status === 'error' && <span style={{ fontSize: 12, color: '#DC2626' }}>{f.error}</span>}
                <button className="btn btn-ghost btn-icon"
                  style={{ color: 'var(--text-tertiary)', fontSize: 12, flexShrink: 0 }}
                  onClick={() => removeFile(f)}>✕</button>
              </div>
              {f.status === 'uploading' && typeof f.progress === 'number' && (
                <div style={{ width: '100%', height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${f.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 2, transition: 'width 300ms ease' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
