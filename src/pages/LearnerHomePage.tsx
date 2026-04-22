import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { learnerProgressApi } from '../lib/api';
import { Spinner, EmptyState } from '../components/ui';

interface ModuleWithStatus {
  id: string;
  module_skill_id: string;
  title: string;
  objective: string | null;
  domain_name: string | null;
  status: string;
  display_order: number;
  release_date_calculated: string | null;
  completed_at: string | null;
  started_at: string | null;
}


interface LearnerHomeData {
  assignment: {
    id: string;
    roadmap_title: string;
    roadmap_description: string | null;
    duration_label: string | null;
    activation_date: string | null;
    allow_early_release: boolean;
  } | null;
  current_module: ModuleWithStatus | null;
  modules: ModuleWithStatus[];
  stats: { total: number; completed: number; available: number; locked: number };
}

const WELCOME_KEY = 'aethoflo_learner_welcomed';
const CALENDAR_ANIMATED_KEY = 'aethoflo_calendar_animated';
const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ── Streak helpers ─────────────────────────────────────────────────────────────
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff).toISOString().split('T')[0];
}

function computeStreak(modules: ModuleWithStatus[]): { streak: number; completedWeeks: Set<string> } {
  const completed = modules.filter(m => m.completed_at);
  const completedWeeks = new Set(completed.map(m => getWeekStart(m.completed_at!)));
  const now = new Date();
  let streak = 0;
  for (let i = 0; i < 52; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    const wk = getWeekStart(d.toISOString());
    if (completedWeeks.has(wk)) {
      streak++;
    } else if (i === 0) {
      continue; // current week not done yet — check previous
    } else {
      break;
    }
  }
  return { streak, completedWeeks };
}

// ── Release date color rules ────────────────────────────────────────────────────
function getReleaseMeta(mod: ModuleWithStatus): { label: string; color: string; badge?: string } | null {
  if (!mod.release_date_calculated) return null;
  const releaseDate = new Date(mod.release_date_calculated + 'T00:00:00');
  const now = new Date();
  const label = releaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (mod.status === 'completed') {
    const early = mod.completed_at && new Date(mod.completed_at) < releaseDate;
    return { label, color: 'var(--status-completed)', badge: early ? 'Early' : undefined };
  }
  if (mod.status === 'locked') {
    return { label, color: 'var(--text-tertiary)' };
  }
  // available or in_progress
  if (releaseDate < now) {
    return { label, color: '#DC2626' }; // red = late
  }
  return { label, color: 'var(--accent)' }; // on track
}

// ── Mini Calendar ──────────────────────────────────────────────────────────────
interface MiniCalendarProps {
  modules: ModuleWithStatus[];
  onModuleClick: (moduleId: string) => void;
}

function MiniCalendar({ modules, onModuleClick }: MiniCalendarProps) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Build release date map
  const releaseDates: Record<string, ModuleWithStatus[]> = {};
  for (const m of modules) {
    if (m.release_date_calculated) {
      const d = m.release_date_calculated.split('T')[0];
      releaseDates[d] = releaseDates[d] || [];
      releaseDates[d].push(m);
    }
  }

  // Build completion date map (for green circles)
  const completionDates: Record<string, ModuleWithStatus[]> = {};
  for (const m of modules) {
    if (m.completed_at) {
      const d = m.completed_at.split('T')[0];
      completionDates[d] = completionDates[d] || [];
      completionDates[d].push(m);
    }
  }

  // Streak computation
  const { streak, completedWeeks } = computeStreak(modules);
  const currentWeekStr = getWeekStart(now.toISOString());
  const last8Weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (7 - i) * 7);
    const wk = getWeekStart(d.toISOString());
    return { wk, active: completedWeeks.has(wk), isCurrent: wk === currentWeekStr };
  });

  const futureDates = Object.keys(releaseDates).filter(d => d >= todayStr).sort();
  const initDate = futureDates.length > 0 ? new Date(futureDates[0] + 'T12:00:00') : now;
  const [viewMonth, setViewMonth] = useState(new Date(initDate.getFullYear(), initDate.getMonth(), 1));

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const upcomingInMonth = futureDates.filter(d => {
    const dt = new Date(d + 'T12:00:00');
    return dt.getFullYear() === year && dt.getMonth() === month;
  });

  const hoveredMods = hoveredDate ? (releaseDates[hoveredDate] || []) : [];

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 16px',
    }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 600, paddingBottom: 6 }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const relMods = releaseDates[dateStr] || [];
          const compMods = completionDates[dateStr] || [];
          const isToday = dateStr === todayStr;
          const hasRelease = relMods.length > 0;
          const hasCompletion = compMods.length > 0;
          const isHovered = dateStr === hoveredDate;
          const isClickable = hasRelease;

          // Circle style: green if completed on this date, today accent, release highlight, or plain
          const circleBg = hasCompletion
            ? 'var(--status-completed)'
            : isToday ? 'var(--accent)'
            : isHovered && hasRelease ? 'var(--accent-light)'
            : hasRelease ? 'var(--accent-light)'
            : 'transparent';

          const circleColor = hasCompletion ? 'white'
            : isToday ? 'white'
            : hasRelease ? 'var(--accent-dark)'
            : 'var(--text-secondary)';

          return (
            <div
              key={day}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 4 }}
              onMouseEnter={() => hasRelease && setHoveredDate(dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <div
                onClick={() => {
                  if (hasRelease) {
                    const firstMod = relMods[0];
                    onModuleClick(firstMod.id);
                  }
                }}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11,
                  background: circleBg,
                  color: circleColor,
                  fontWeight: isToday || hasRelease || hasCompletion ? 600 : 400,
                  cursor: isClickable ? 'pointer' : 'default',
                  border: isHovered && hasRelease ? '1px solid var(--accent-mid)' : '1px solid transparent',
                  transition: 'background 100ms',
                  position: 'relative',
                }}
              >
                {day}
                {/* Faint checkmark overlay for completed days */}
                {hasCompletion && (
                  <span style={{
                    position: 'absolute', fontSize: 8, color: 'rgba(255,255,255,0.55)',
                    fontWeight: 900, pointerEvents: 'none',
                  }}>✓</span>
                )}
              </div>
              {/* Orange dot below for all release dates */}
              {hasRelease && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', marginTop: 1 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Hover tooltip */}
      {hoveredMods.length > 0 && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          background: 'var(--text-primary)',
          borderRadius: 8,
          fontSize: 11,
          color: 'white',
          lineHeight: 1.4,
        }}>
          {hoveredMods.map(m => (
            <div key={m.id}>
              {m.domain_name && <span style={{ opacity: 0.6, fontSize: 10 }}>{m.domain_name} · </span>}
              {m.title}
            </div>
          ))}
        </div>
      )}

      {/* Upcoming this month */}
      {upcomingInMonth.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
            Upcoming
          </div>
          {upcomingInMonth.slice(0, 4).flatMap(dateStr => {
            const date = new Date(dateStr + 'T12:00:00');
            return (releaseDates[dateStr] || []).map(m => (
              <div key={m.id}
                onClick={() => onModuleClick(m.id)}
                style={{ display: 'flex', gap: 7, marginBottom: 6, alignItems: 'flex-start', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, minWidth: 34, flexShrink: 0, paddingTop: 1 }}>
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{m.title}</span>
              </div>
            ));
          })}
        </div>
      )}

      {/* Streak — merged below calendar, no frame */}
      <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {/* 8-week activity circles */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 4 }}>
          {last8Weeks.map((w, i) => (
            <div key={i} title={w.wk} style={{
              width: 22, height: 22, borderRadius: '50%',
              background: w.active ? 'var(--status-completed)'
                : w.isCurrent ? 'var(--accent-light)'
                : 'var(--surface-3)',
              border: w.isCurrent ? '1px solid var(--accent-mid)' : '1px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {w.active && (
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>✓</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, color: streak > 0 ? 'var(--accent)' : 'var(--text-tertiary)', fontWeight: streak > 0 ? 600 : 400 }}>
          {streak > 0
            ? `${streak}-week streak · ${modules.filter(m => m.completed_at).length} completed`
            : 'Complete a module to start your streak'}
        </div>
      </div>
    </div>
  );
}

// ── Save button ────────────────────────────────────────────────────────────────
function SaveButton({ moduleId, saved, onToggle }: { moduleId: string; saved: boolean; onToggle: (id: string, newSaved: boolean) => void }) {
  const [loading, setLoading] = useState(false);
  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await learnerProgressApi.toggleSave(moduleId);
      onToggle(moduleId, res.saved);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button onClick={handle} disabled={loading}
      title={saved ? 'Remove from saved' : 'Save this module'}
      style={{
        background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
        fontSize: 18, lineHeight: 1, padding: '2px 4px',
        color: saved ? '#E11D48' : 'var(--text-tertiary)',
        opacity: loading ? 0.5 : 1, transition: 'color 150ms, transform 150ms', flexShrink: 0,
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
    >
      {saved ? '♥' : '♡'}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function LearnerHomePage() {
  const [data, setData] = useState<LearnerHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(WELCOME_KEY));
  const [unlocking, setUnlocking] = useState(false);
  const [lockedFlash, setLockedFlash] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 700);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const navigate = useNavigate();
  const moduleRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchData = useCallback(() => {
    learnerProgressApi.getMy().then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    learnerProgressApi.getSaved().then(items => {
      setSavedIds(new Set(items.map(i => i.id)));
    }).catch(() => {});
    const onResize = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fetchData]);

  // Mobile calendar: animate open once per session, then collapse → scroll to active module
  useEffect(() => {
    if (!isMobile || !data?.modules.length) return;
    const alreadyRan = sessionStorage.getItem(CALENDAR_ANIMATED_KEY);
    if (alreadyRan) return;

    const t1 = setTimeout(() => setCalendarOpen(true), 300);
    const t2 = setTimeout(() => {
      setCalendarOpen(false);
      sessionStorage.setItem(CALENDAR_ANIMATED_KEY, '1');
    }, 2500);
    const t3 = setTimeout(() => {
      const activeId = data.current_module?.id ?? data.modules.find(m => m.status !== 'locked')?.id;
      if (activeId && moduleRefs.current[activeId]) {
        moduleRefs.current[activeId]!.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 3000);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isMobile, data]);

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_KEY, 'true');
    setShowWelcome(false);
  };

  const handleToggleSave = (moduleId: string, newSaved: boolean) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (newSaved) next.add(moduleId); else next.delete(moduleId);
      return next;
    });
  };

  const handleUnlockEarlyAccess = async () => {
    setUnlocking(true);
    try {
      await learnerProgressApi.unlockEarlyAccess();
      const fresh = await learnerProgressApi.getMy();
      setData(fresh);
    } finally {
      setUnlocking(false);
    }
  };

  const handleCalendarModuleClick = (moduleId: string) => {
    const el = moduleRefs.current[moduleId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Brief highlight flash
      el.style.boxShadow = 'var(--shadow-accent)';
      setTimeout(() => { el.style.boxShadow = ''; }, 1200);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <Spinner size={32} />
    </div>
  );

  if (!data?.assignment) return (
    <EmptyState icon="◈" title="No active training"
      description="You haven't been assigned a training roadmap yet. Check back soon." />
  );

  const { assignment, current_module, modules, stats } = data;
  const earlyReleaseEnabled = assignment.allow_early_release;

  // Detect repeat modules: skill_ids that appear more than once
  const seenSkillIds = new Set<string>();
  const repeatModuleIds = new Set<string>();
  for (const m of modules) {
    if (seenSkillIds.has(m.module_skill_id)) repeatModuleIds.add(m.id);
    else seenSkillIds.add(m.module_skill_id);
  }

  // Monthly progress — modules whose release date falls in the current calendar month
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthModules = modules.filter(m => {
    const d = m.release_date_calculated;
    return d && d.slice(0, 7) === monthYear;
  });
  const monthCompleted = monthModules.filter(m => m.status === 'completed').length;
  const monthTotal = monthModules.length;
  const monthPct = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;
  const monthAllDone = monthTotal > 0 && monthCompleted === monthTotal;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="animate-fade-up" style={{ maxWidth: 1100 }}>

      {/* Welcome card inline on mobile */}
      {showWelcome && isMobile && (
        <div style={{
          marginBottom: 24,
          background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 16,
          padding: '20px 22px', position: 'relative',
        }}>
          <button onClick={dismissWelcome} style={{
            position: 'absolute', top: 12, right: 14,
            background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 20, lineHeight: 1, padding: 0,
          }}>×</button>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B', marginBottom: 8 }}>
            Welcome — here's how this works
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '⊟', text: "Each module has a short resource plus a quick check-in at the end." },
              { icon: '◉', text: "New modules release automatically — you'll get notified by email or text when they drop." },
              { icon: '◈', text: "Your login link works automatically — bookmark it for quick access." },
            ].map(({ icon, text }) => (
              <div key={icon} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1, color: '#7C3AED' }}>{icon}</span>
                <span style={{ fontSize: 12, color: '#3730A3', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
          <button onClick={dismissWelcome} style={{
            marginTop: 16, width: '100%', padding: '9px 16px',
            background: '#7C3AED', color: 'white', border: 'none',
            borderRadius: 100, fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            Got it — let's go →
          </button>
        </div>
      )}

      {/* Two-column layout — flex-wrap so calendar stacks on top on mobile */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Calendar — desktop only */}
        {!isMobile && (
          <div style={{ width: 300, flexShrink: 0, order: 2 }}>
            <div style={{ position: 'sticky', top: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)',
                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Release Schedule
              </p>
              <MiniCalendar modules={modules} onModuleClick={handleCalendarModuleClick} />
            </div>
          </div>
        )}

        {/* LEFT: Roadmap */}
        <div style={{ flex: 1, minWidth: 300, order: 1 }}>

          {/* Roadmap header */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Your Roadmap
            </p>
            <h2 style={{ marginBottom: 8 }}>{assignment.roadmap_title}</h2>
            {assignment.roadmap_description && (
              <p style={{ fontSize: 14 }}>{assignment.roadmap_description}</p>
            )}
            <div style={{ marginTop: 20 }}>
              {monthTotal === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  No modules scheduled for {monthName}
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {monthName}'s Progress: {monthCompleted}/{monthTotal} modules
                    </span>
                    <span style={{
                      fontWeight: 600,
                      color: monthAllDone ? 'var(--status-completed)' : 'var(--text-primary)',
                      fontSize: 13,
                    }}>
                      {monthPct}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{
                      width: `${monthPct}%`,
                      background: monthAllDone ? 'var(--status-completed)' : undefined,
                    }} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile calendar strip — tap to expand, auto-animates on first session */}
          {isMobile && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setCalendarOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: calendarOpen ? 'var(--radius-lg) var(--radius-lg) 0 0' : 'var(--radius-lg)',
                  padding: '10px 16px', cursor: 'pointer', transition: 'border-radius 200ms',
                }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)',
                  letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Release Schedule
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)',
                  transform: calendarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 300ms', display: 'inline-block' }}>
                  ▾
                </span>
              </button>
              <div style={{
                maxHeight: calendarOpen ? 520 : 0,
                overflow: 'hidden',
                transition: 'max-height 600ms cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                border: calendarOpen ? '1px solid var(--border)' : 'none',
                borderTop: 'none',
              }}>
                <div style={{ padding: '4px 0 0' }}>
                  <MiniCalendar modules={modules} onModuleClick={handleCalendarModuleClick} />
                </div>
              </div>
            </div>
          )}

          <h4 style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontWeight: 500, letterSpacing: '0.06em',
            textTransform: 'uppercase' }}>
            Full Roadmap
          </h4>

          {/* Vertical timeline */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 9, top: 20, bottom: 20, width: 2,
              background: 'linear-gradient(to bottom, var(--accent) 0%, var(--border) 100%)',
              borderRadius: 1,
            }} />

            <div style={{ paddingLeft: 36, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {modules.map((mod, idx) => {
                const isCurrent = mod.id === current_module?.id;
                const isLocked = mod.status === 'locked';
                const isCompleted = mod.status === 'completed';
                const isClickable = !isLocked;
                const isSaved = savedIds.has(mod.id);
                const relMeta = getReleaseMeta(mod);

                const circleBg = isCompleted ? 'var(--status-completed)'
                  : isCurrent ? 'var(--accent)'
                  : isLocked ? 'var(--surface-3)'
                  : 'var(--accent-light)';
                const circleBorder = (!isCompleted && !isCurrent && !isLocked)
                  ? '2px solid var(--accent)'
                  : isLocked ? '2px solid var(--border)' : 'none';

                return (
                  <div key={mod.id} style={{ position: 'relative', animationDelay: `${idx * 30}ms` }}>
                    {/* Timeline node */}
                    {isLocked && !earlyReleaseEnabled ? (
                      <button
                        title="Click to unlock early access"
                        onClick={() => handleUnlockEarlyAccess()}
                        disabled={unlocking}
                        style={{
                          position: 'absolute', left: -36, top: 16,
                          width: 20, height: 20, borderRadius: '50%',
                          background: unlocking ? 'var(--accent-light)' : 'var(--surface-3)',
                          border: '2px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: unlocking ? 'default' : 'pointer',
                          zIndex: 1, padding: 0,
                          transition: 'background 150ms, border-color 150ms',
                        }}
                        onMouseEnter={e => {
                          if (!unlocking) {
                            (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-light)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-mid)';
                          }
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-3)';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                        }}
                      >
                        <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
                          <rect x="0.75" y="4.75" width="7.5" height="5.5" rx="1.25" stroke="var(--text-tertiary)" strokeWidth="1.25"/>
                          <path d="M2.5 4.5V3A2 2 0 0 1 6.5 3v1.5" stroke="var(--text-tertiary)" strokeWidth="1.25" strokeLinecap="round"/>
                        </svg>
                      </button>
                    ) : (
                      <div style={{
                        position: 'absolute', left: -36, top: 16,
                        width: 20, height: 20, borderRadius: '50%',
                        background: circleBg, border: circleBorder,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700,
                        color: isCompleted ? 'white' : isCurrent ? 'white' : 'var(--text-tertiary)',
                        zIndex: 1,
                        boxShadow: isCurrent ? '0 0 0 4px var(--accent-light)' : 'none',
                      }}>
                        {isCompleted ? '✓' : null}
                      </div>
                    )}

                    {/* Module card */}
                    <div
                      ref={el => { moduleRefs.current[mod.id] = el; }}
                      className="card"
                      onClick={() => {
                        if (isLocked) {
                          const msg = mod.release_date_calculated
                            ? `Available ${fmtDate(mod.release_date_calculated)} — click the lock to access early`
                            : 'Not yet released — click the lock to access early';
                          setLockedFlash(msg);
                          setTimeout(() => setLockedFlash(null), 3000);
                        } else {
                          navigate(`/learner/module/${mod.id}`);
                        }
                      }}
                      style={{
                        padding: isCurrent ? '16px 18px' : '11px 16px',
                        cursor: isClickable ? 'pointer' : 'default',
                        opacity: isLocked && !earlyReleaseEnabled ? 0.75 : 1,
                        borderColor: isCurrent ? 'var(--accent-mid)' : undefined,
                        background: isCurrent ? 'var(--accent-light)' : undefined,
                        transition: 'transform var(--duration-base) var(--ease-out), box-shadow 400ms ease',
                      }}
                      onMouseEnter={isClickable ? e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; } : undefined}
                      onMouseLeave={isClickable ? e => { (e.currentTarget as HTMLDivElement).style.transform = ''; } : undefined}
                    >
                      {/* Card header row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {mod.domain_name && (
                            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 3, letterSpacing: '0.04em',
                              color: isLocked ? 'var(--text-tertiary)' : 'var(--accent-dark)' }}>
                              {mod.domain_name}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: isCurrent ? 600 : 500, fontSize: isCurrent ? 15 : 14,
                              color: isLocked ? 'var(--text-secondary)' : 'var(--text-primary)', lineHeight: 1.3 }}>
                              {mod.title}
                            </span>
                            {repeatModuleIds.has(mod.id) && (
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#92400E',
                                background: '#FEF3C7', border: '1px solid #FDE68A',
                                borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                                ↻ Repeat
                              </span>
                            )}
                          </div>
                          {isCurrent && mod.objective && (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>
                              {mod.objective}
                            </p>
                          )}
                        </div>

                        {/* Right: release date + save */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          {relMeta && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {relMeta.badge && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--status-completed)',
                                  background: '#DCFCE7', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em' }}>
                                  {relMeta.badge}
                                </span>
                              )}
                              <span style={{ fontSize: 11, fontWeight: 500, color: relMeta.color }}>
                                {relMeta.label}
                              </span>
                            </div>
                          )}
                          {!isLocked && (
                            <SaveButton moduleId={mod.id} saved={isSaved} onToggle={handleToggleSave} />
                          )}
                        </div>
                      </div>

                      {/* CTA row */}
                      {isCurrent && (
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                          <button className="btn btn-primary btn-sm">
                            {mod.status === 'in_progress' ? 'Continue →' : 'Start module →'}
                          </button>
                          {mod.status === 'in_progress' && mod.started_at && (
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                              Last accessed {fmtDate(mod.started_at)}
                            </span>
                          )}
                          {mod.status === 'completed' && mod.completed_at && (
                            <span style={{ fontSize: 11, color: 'var(--status-completed)' }}>
                              Completed {fmtDate(mod.completed_at)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Locked hint */}
                      {isLocked && !earlyReleaseEnabled && (
                        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {mod.release_date_calculated
                            ? `Unlocks ${fmtDate(mod.release_date_calculated)} — click the lock to access early`
                            : 'Coming soon — click the lock to access early'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Locked module toast */}
      {lockedFlash && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1E1B4B', color: 'white', borderRadius: 100,
          padding: '10px 20px', fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 2000,
          whiteSpace: 'nowrap', animation: 'fadeUp 200ms var(--ease-out) both',
        }}>
          🔒 {lockedFlash}
        </div>
      )}

      {/* Welcome card — fixed bottom-right on desktop only */}
      {showWelcome && !isMobile && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, width: 300,
          background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 16,
          padding: '20px 22px', boxShadow: '0 8px 32px rgba(109,40,217,0.12)', zIndex: 50,
        }}>
          <button onClick={dismissWelcome} style={{
            position: 'absolute', top: 12, right: 14,
            background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 20, lineHeight: 1, padding: 0,
          }}>×</button>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B', marginBottom: 8 }}>
            Welcome — here's how this works
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '⊟', text: "Each module has a short resource plus a quick check-in at the end." },
              { icon: '◉', text: "New modules release automatically — you'll get notified by email or text the moment they drop." },
              { icon: '◈', text: "Your login link works automatically — bookmark it for quick access anytime." },
            ].map(({ icon, text }) => (
              <div key={icon} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1, color: '#7C3AED' }}>{icon}</span>
                <span style={{ fontSize: 12, color: '#3730A3', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
          <button onClick={dismissWelcome} style={{
            marginTop: 16, width: '100%', padding: '9px 16px',
            background: '#7C3AED', color: 'white', border: 'none',
            borderRadius: 100, fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            Got it — let's go →
          </button>
        </div>
      )}
    </div>
  );
}
