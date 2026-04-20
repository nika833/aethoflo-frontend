import React from 'react';

export interface MediaItem {
  id: string; media_type: string; title: string | null; url: string;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

export default function MediaBlock({ item }: { item: MediaItem }) {
  const label = item.title || item.url.split('/').pop() || 'Resource';
  const url = item.url;

  const ytId = getYouTubeId(url);
  const vimeoId = getVimeoId(url);
  const isDirectVideo = !ytId && !vimeoId && /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
  const isImage = /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(url);
  const isPdf = /\.pdf(\?|$)/i.test(url);

  if (ytId) {
    return (
      <div>
        {item.title && <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--text-primary)' }}>{item.title}</div>}
        <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </div>
    );
  }

  if (vimeoId) {
    return (
      <div>
        {item.title && <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--text-primary)' }}>{item.title}</div>}
        <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </div>
    );
  }

  if (isDirectVideo) {
    return (
      <div>
        {item.title && <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--text-primary)' }}>{item.title}</div>}
        <video controls style={{ width: '100%', borderRadius: 10, background: '#000', maxHeight: 420 }}>
          <source src={url} />
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  if (isImage) {
    return (
      <div>
        {item.title && <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--text-primary)' }}>{item.title}</div>}
        <img src={url} alt={label} style={{ width: '100%', borderRadius: 10, display: 'block' }} />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div>
        {item.title && <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text-primary)' }}>{item.title}</div>}
        <iframe src={url} style={{ width: '100%', height: 520, border: '1px solid var(--border)', borderRadius: 10 }} />
        <a href={url} target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
          Open PDF in new tab ↗
        </a>
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="card"
      style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        color: 'var(--text-primary)', textDecoration: 'none' }}>
      <span style={{ fontSize: 18 }}>
        {item.media_type === 'video' ? '▶' : item.media_type === 'document' ? '📄' : '🔗'}
      </span>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>Open ↗</span>
    </a>
  );
}
