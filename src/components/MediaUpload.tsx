import React, { useRef, useState, useCallback } from 'react';
import { mediaApi } from '../lib/api';
import { Spinner } from './ui';

interface MediaFile {
  id?: string;
  name: string;
  mime_type: string;
  size: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
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

export function MediaUpload({ moduleId }: { moduleId: string }) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [recording, setRecording] = useState<'idle' | 'audio' | 'video'>('idle');
  const [recSeconds, setRecSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunks = useRef<Blob[]>([]);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    const entry: MediaFile = {
      name: file.name,
      mime_type: file.type,
      size: file.size,
      status: 'uploading',
    };
    setFiles((f) => [...f, entry]);
    const idx = -1; // use name as key

    try {
      const { upload_url, s3_key, media_type, public_url } = await mediaApi.presign({
        filename: file.name,
        mime_type: file.type,
        module_skill_id: moduleId,
      });

      await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      const registered = await mediaApi.register({
        module_skill_id: moduleId,
        media_type,
        title: file.name,
        url: public_url || upload_url.split('?')[0],
        s3_key,
        file_size_bytes: file.size,
        mime_type: file.type,
      });

      setFiles((f) => f.map((e) =>
        e.name === entry.name && e.status === 'uploading'
          ? { ...e, status: 'done', id: registered.id, url: s3Base }
          : e
      ));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Upload failed';
      setFiles((f) => f.map((e) =>
        e.name === entry.name && e.status === 'uploading'
          ? { ...e, status: 'error', error: msg }
          : e
      ));
    }
  }, [moduleId]);

  const handleFiles = (incoming: FileList | File[]) => {
    Array.from(incoming).forEach(uploadFile);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const removeFile = async (f: MediaFile) => {
    if (f.id) {
      try { await mediaApi.delete(f.id); } catch {}
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
        const file = new File([blob], `recording-${ts}.webm`, { type: mime });
        uploadFile(file);
        setRecording('idle');
        setRecSeconds(0);
        if (recTimer.current) clearInterval(recTimer.current);
      };
      mr.start();
      setRecording(mode);
      setRecSeconds(0);
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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Record buttons */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Record:</span>
        {recording === 'idle' ? (
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => startRecording('audio')}
              style={{ gap: 6 }}>
              🎙 Audio
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => startRecording('video')}
              style={{ gap: 6 }}>
              📹 Video
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#DC2626', fontWeight: 600, fontSize: 13,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626',
                animation: 'pulse-soft 1s infinite' }} />
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
            }}>
              <span style={{ fontSize: 20 }}>{fileIcon(f.mime_type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {fileTypeLabel(f.mime_type)} · {formatBytes(f.size)}
                </div>
              </div>

              {f.status === 'uploading' && <Spinner size={16} />}
              {f.status === 'done' && <span style={{ color: '#2E7D52', fontSize: 16 }}>✓</span>}
              {f.status === 'error' && (
                <span style={{ fontSize: 12, color: '#DC2626' }}>{f.error}</span>
              )}

              <button className="btn btn-ghost btn-icon"
                style={{ color: 'var(--text-tertiary)', fontSize: 12, flexShrink: 0 }}
                onClick={() => removeFile(f)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
