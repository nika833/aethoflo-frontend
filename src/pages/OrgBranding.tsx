import React, { useEffect, useRef, useState } from 'react';
import { orgApi, OrgSettings, PLAN_TIERS, PlanName } from '../lib/api';

const DEFAULT_PRIMARY = '#5C3520';
const DEFAULT_ACCENT  = '#C96B47';

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Live Sidebar Preview ─────────────────────────────────────────────────────
function SidebarPreview({
  logoUrl,
  primaryColor,
  accentColor,
}: {
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
}) {
  const navItems = ['Dashboard', 'Domains', 'Modules', 'Roadmaps'];
  return (
    <div style={{
      width: 160, borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      border: '1px solid var(--border)',
      flexShrink: 0,
    }}>
      {/* Logo area */}
      <div style={{
        background: primaryColor, padding: '14px 12px',
        borderBottom: `1px solid rgba(255,255,255,0.1)`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {logoUrl
          ? <img src={logoUrl} alt="Logo preview" style={{ height: 24, maxWidth: 100, objectFit: 'contain' }} />
          : <div style={{
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
              letterSpacing: 1, textTransform: 'uppercase',
            }}>Your Logo</div>
        }
      </div>
      {/* Nav items */}
      <div style={{ background: primaryColor, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map((item, i) => (
          <div key={item} style={{
            padding: '7px 10px', borderRadius: 6, fontSize: 11,
            background: i === 0 ? hexToRgba(accentColor, 0.18) : 'transparent',
            color: i === 0 ? accentColor : 'rgba(255,255,255,0.45)',
            fontWeight: i === 0 ? 600 : 400,
          }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrgBranding() {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [accentColor, setAccentColor]   = useState(DEFAULT_ACCENT);

  // Upload state
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save state
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    orgApi.settings()
      .then((s) => {
        setSettings(s);
        setLogoUrl(s.logo_url);
        setPrimaryColor(s.primary_color ?? DEFAULT_PRIMARY);
        setAccentColor(s.accent_color  ?? DEFAULT_ACCENT);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const plan    = (settings?.plan ?? 'starter') as PlanName;
  const tier    = PLAN_TIERS[plan] ?? PLAN_TIERS.starter;
  const canBrand = tier.white_label;

  // ─── Logo upload ────────────────────────────────────────────────────────────
  const handleLogoFile = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setUploadError('Please upload a PNG, JPG, SVG, or WebP file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Logo must be under 2 MB.');
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      const { upload_url, public_url } = await orgApi.logoPresign({ filename: file.name, mime_type: file.type });
      await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setLogoUrl(public_url);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ─── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      const updated = await orgApi.updateSettings({
        logo_url:      logoUrl,
        primary_color: primaryColor,
        accent_color:  accentColor,
      });
      setSettings(updated);
      setSaved(true);
      // Notify AppShell to re-apply colors immediately
      window.dispatchEvent(new CustomEvent('org-settings-updated'));
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSaveError(msg || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Seat info for Plan card ────────────────────────────────────────────────
  const seatInfo = settings ? [
    { label: 'Plan', value: tier.label },
    {
      label: 'Admin seats',
      value: settings.max_admins === -1 ? 'Unlimited' : String(settings.max_admins),
    },
    {
      label: 'Learner seats',
      value: settings.max_learners === -1 ? 'Unlimited' : String(settings.max_learners),
    },
  ] : [];

  if (loading) return (
    <div style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Loading…</div>
  );

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Branding
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, marginBottom: 0 }}>
          Customize how your platform looks for your team.
        </p>
      </div>

      {/* ── Plan info ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface-2)', borderRadius: 12,
        padding: '18px 20px', marginBottom: 24,
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
      }}>
        {seatInfo.map((item) => (
          <div key={item.label}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              {item.value}
            </div>
          </div>
        ))}
        {!canBrand && (
          <div style={{ marginLeft: 'auto' }}>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 20,
              background: '#FEF3C7', color: '#92400E',
              border: '1px solid #FDE68A',
            }}>
              ⬡ Upgrade to Core or above to unlock branding
            </span>
          </div>
        )}
      </div>

      {/* ── Branding editor ───────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 14,
        border: '1px solid var(--border)',
        overflow: 'hidden',
        opacity: canBrand ? 1 : 0.5,
        pointerEvents: canBrand ? 'auto' : 'none',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
            Customize your sidebar
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Changes apply immediately for all users in your organization.
          </div>
        </div>

        <div style={{ padding: '24px', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {/* Controls */}
          <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Logo upload */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
                Organization logo
              </div>
              {logoUrl && (
                <div style={{
                  marginBottom: 12, padding: '10px 14px', background: 'var(--surface-2)',
                  borderRadius: 8, border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <img src={logoUrl} alt="Current logo" style={{ height: 32, maxWidth: 120, objectFit: 'contain' }} />
                  <button
                    onClick={() => setLogoUrl(null)}
                    style={{
                      marginLeft: 'auto', background: 'none', border: 'none',
                      color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 12,
                      textDecoration: 'underline',
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {uploading ? (
                  <>
                    <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Uploading…
                  </>
                ) : (
                  <>{logoUrl ? '↺ Replace logo' : '↑ Upload logo'}</>
                )}
              </button>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
                PNG, JPG, SVG or WebP · max 2 MB · recommended height 40px
              </div>
              {uploadError && (
                <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 6 }}>{uploadError}</div>
              )}
            </div>

            {/* Color pickers */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
                Sidebar colors
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Primary color */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Background color</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Sidebar background · {primaryColor}</div>
                  </div>
                  <button
                    onClick={() => setPrimaryColor(DEFAULT_PRIMARY)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 11, color: 'var(--text-tertiary)', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Reset
                  </button>
                </label>

                {/* Accent color */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Accent color</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Active nav highlight · {accentColor}</div>
                  </div>
                  <button
                    onClick={() => setAccentColor(DEFAULT_ACCENT)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 11, color: 'var(--text-tertiary)', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Reset
                  </button>
                </label>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Live preview
            </div>
            <SidebarPreview
              logoUrl={logoUrl}
              primaryColor={primaryColor}
              accentColor={accentColor}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-light)',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          {saveError && (
            <div style={{ fontSize: 13, color: '#B91C1C' }}>{saveError}</div>
          )}
          {saved && (
            <div style={{ fontSize: 13, color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✓</span> Branding saved — sidebar updated for all users
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ marginLeft: 'auto' }}
            onClick={handleSave}
            disabled={saving || uploading}
          >
            {saving ? 'Saving…' : 'Save branding'}
          </button>
        </div>
      </div>

      {!canBrand && (
        <div style={{
          marginTop: 16, padding: '14px 18px',
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
          fontSize: 13, color: '#78350F',
        }}>
          <strong>Want custom branding?</strong> Upgrade to the Core plan or above to unlock logo upload and custom sidebar colors.
          Contact us to upgrade your organization.
        </div>
      )}
    </div>
  );
}
