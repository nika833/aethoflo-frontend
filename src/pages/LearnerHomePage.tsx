import React, { useEffect, useState, useCallback } from 'react';
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
}

interface SavedModule {
  id: string;
  title: string;
  objective: string | null;
  domain_name: string | null;
  saved_at: string;
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

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function MiniCalendar({ modules }: { modules: ModuleWithStatus[] }) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const releaseDates: Record<string, ModuleWithStatus[]> = {};
  for (const m of modules) {
    if (m.release_date_calculated) {
      const d = m.release_date_calculated.split('T')[0];
      releaseDates[d] = releaseDates[d] || [];
      releaseDates[d].push(m);
    }
  }

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

  // Next release countdown
  const nextDate = futureDates[0] ? new Date(futureDates[0] + 'T12:00:00') : null;
  const daysUntil = nextDate
    ? Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div>
      {/* Next release chip */}
      {nextDate && daysUntil !== null && daysUntil >= 0 && (
        <div style={{
          background: '#F5F3FF',
          border: '1px solid #DDD6FE',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 4 }}>
            Next release
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#4C1D95' }}>
            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
          </div>
          <div style={{ fontSize: 11, color: '#6D28D9', marginTop: 2 }}>
            {nextDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — {(releaseDates[futureDates[0]] || [])[0]?.title}
          </div>
        </div>
      )}

      {/* Calendar card */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
          >‹</button>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
          >›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 600, paddingBottom: 6 }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const mods = releaseDates[dateStr] || [];
            const isToday = dateStr === todayStr;
            const hasRelease = mods.length > 0;
            const allCompleted = hasRelease && mods.every(m => m.status === 'completed');

            return (
              <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11,
                  background: isToday ? 'var(--accent)' : hasRelease ? 'var(--accent-light)' : 'transparent',
                  color: isToday ? 'white' : hasRelease ? 'var(--accent-dark)' : 'var(--text-secondary)',
                  fontWeight: isToday || hasRelease ? 600 : 400,
                }}>
                  {day}
                </div>
                {hasRelease && (
                  <div style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: allCompleted ? 'var(--status-completed)' : 'var(--accent)',
                    marginTop: 2,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {upcomingInMonth.length > 0 && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              This month
            </div>
            {upcomingInMonth.slice(0, 5).flatMap(dateStr => {
              const date = new Date(dateStr + 'T12:00:00');
              return (releaseDates[dateStr] || []).map(m => (
                <div key={m.id} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, minWidth: 36, flexShrink: 0, paddingTop: 1 }}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {m.title}
                  </span>
                </div>
              ));
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Streak Widget ─────────────────────────────────────────────────────────────

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff).toISOString().split('T')[0];
}

function StreakWidget({ modules }: { modules: ModuleWithStatus[] }) {
  const completed = modules.filter(m => m.completed_at);
  const completedWeeks = new Set(completed.map(m => getWeekStart(m.completed_at!)));
  const now = new Date();
  const currentWeekStr = getWeekStart(now.toISOString());

  // Count consecutive weeks ending at current or last week
  let streak = 0;
  for (let i = 0; i < 52; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    const wk = getWeekStart(d.toISOString());
    if (completedWeeks.has(wk)) {
      streak++;
    } else if (i === 0) {
      // haven't done anything this week yet — check last week before breaking
      continue;
    } else {
      break;
    }
  }

  // Last 8 weeks for activity grid
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (7 - i) * 7);
    const wk = getWeekStart(d.toISOString());
    return { wk, active: completedWeeks.has(wk), isCurrent: wk === currentWeekStr };
  });

  const msg = streak === 0
    ? 'Complete a module to start your streak'
    : streak === 1 ? "You're on your way — keep going this week"
    : streak < 4 ? `${streak} weeks strong — you're building momentum`
    : `${streak} weeks and counting — you're on a roll ◉`;

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 18px',
      marginBottom: 14,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10 }}>
        Activity
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', lineHeight: 1, color: streak > 0 ? 'var(--accent)' : 'var(--text-tertiary)' }}>
          {streak}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>week streak</span>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '0 0 14px', lineHeight: 1.5 }}>{msg}</p>

      {/* 8-week activity grid */}
      <div style={{ display: 'flex', gap: 3 }}>
        {weeks.map((w, i) => (
          <div key={i} title={w.wk} style={{
            flex: 1, height: 18, borderRadius: 3,
            background: w.active ? 'var(--accent)' : w.isCurrent ? 'var(--accent-light)' : 'var(--surface-3)',
            border: w.isCurrent ? '1px solid var(--accent-mid)' : '1px solid transparent',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>8 wks ago</span>
        <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>This week</span>
      </div>

      {/* Stats row */}
      <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-around' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{completed.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>completed</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{completedWeeks.size}</div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>active weeks</div>
        </div>
      </div>
    </div>
  );
}

// ♥ Save button
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
    <button
      onClick={handle}
      disabled={loading}
      title={saved ? 'Remove from saved' : 'Save this module'}
      style={{
        background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
        fontSize: 18, lineHeight: 1, padding: '2px 4px',
        color: saved ? '#E11D48' : 'var(--text-tertiary)',
        opacity: loading ? 0.5 : 1,
        transition: 'color 150ms, transform 150ms',
        transform: 'none',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.2)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
    >
      {saved ? '♥' : '♡'}
    </button>
  );
}

export default function LearnerHomePage() {
  const [data, setData] = useState<LearnerHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(WELCOME_KEY));
  const [unlocking, setUnlocking] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedModules, setSavedModules] = useState<SavedModule[]>([]);
  const navigate = useNavigate();

  const fetchData = useCallback(() => {
    learnerProgressApi.getMy().then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    learnerProgressApi.getSaved().then(items => {
      setSavedIds(new Set(items.map(i => i.id)));
      setSavedModules(items);
    }).catch(() => {});
  }, [fetchData]);

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
    if (!newSaved) {
      setSavedModules(prev => prev.filter(m => m.id !== moduleId));
    } else {
      const mod = data?.modules.find(m => m.id === moduleId);
      if (mod) {
        setSavedModules(prev => [{ id: mod.id, title: mod.title, objective: mod.objective, domain_name: mod.domain_name, saved_at: new Date().toISOString() }, ...prev]);
      }
    }
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!data?.assignment) {
    return (
      <EmptyState
        icon="◈"
        title="No active training"
        description="You haven't been assigned a training roadmap yet. Check back soon."
      />
    );
  }

  const { assignment, current_module, modules, stats } = data;
  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const hasCalendarData = modules.some(m => m.release_date_calculated);
  const earlyReleaseEnabled = assignment.allow_early_release;

  return (
    <div className="animate-fade-up" style={{ maxWidth: 1100 }}>

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* Left: Roadmap */}
        <div style={{ flex: 1, minWidth: 0 }}>

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
              <div style={{ display: 'flex', justifyContent: 'space-between',
                fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <span>{stats.completed} of {stats.total} modules complete</span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{pct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* Section label */}
          <h4 style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)',
            fontFamily: 'var(--font-body)', fontWeight: 500, letterSpacing: '0.06em',
            textTransform: 'uppercase' }}>
            Full Roadmap
          </h4>

          {/* Vertical timeline */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: 9, top: 20, bottom: 20,
              width: 2,
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

                const circleBg = isCompleted
                  ? 'var(--status-completed)'
                  : isCurrent ? 'var(--accent)'
                  : isLocked ? 'var(--surface-3)'
                  : 'var(--accent-light)';
                const circleBorder = (!isCompleted && !isCurrent && !isLocked) ? '2px solid var(--accent)'
                  : isLocked ? '2px solid var(--border)' : 'none';

                return (
                  <div key={mod.id} style={{ position: 'relative', animationDelay: `${idx * 30}ms` }}>
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

                    <div
                      className="card"
                      onClick={() => isClickable && navigate(`/learner/module/${mod.id}`)}
                      style={{
                        padding: isCurrent ? '16px 18px' : '11px 16px',
                        cursor: isClickable ? 'pointer' : 'default',
                        opacity: isLocked && !earlyReleaseEnabled ? 0.75 : 1,
                        borderColor: isCurrent ? 'var(--accent-mid)' : undefined,
                        background: isCurrent ? 'var(--accent-light)' : undefined,
                        transition: 'transform var(--duration-base) var(--ease-out)',
                      }}
                      onMouseEnter={isClickable ? (e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)'; } : undefined}
                      onMouseLeave={isClickable ? (e) => { (e.currentTarget as HTMLDivElement).style.transform = ''; } : undefined}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {mod.domain_name && (
                            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 3, letterSpacing: '0.04em', color: isLocked ? 'var(--text-tertiary)' : 'var(--accent-dark)' }}>
                              {mod.domain_name}
                            </div>
                          )}
                          <div style={{ fontWeight: isCurrent ? 600 : 500, fontSize: isCurrent ? 15 : 14, color: isLocked ? 'var(--text-secondary)' : 'var(--text-primary)', lineHeight: 1.3 }}>
                            {mod.title}
                          </div>
                          {isCurrent && mod.objective && (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>
                              {mod.objective}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          {isCompleted && (
                            <span style={{ fontSize: 11, color: 'var(--status-completed)', fontWeight: 600, paddingTop: 2 }}>Done</span>
                          )}
                          {!isLocked && (
                            <SaveButton moduleId={mod.id} saved={isSaved} onToggle={handleToggleSave} />
                          )}
                        </div>
                      </div>

                      {isCurrent && (
                        <div style={{ marginTop: 12 }}>
                          <button className="btn btn-primary btn-sm">
                            {mod.status === 'in_progress' ? 'Continue →' : 'Start module →'}
                          </button>
                        </div>
                      )}

                      {isLocked && !earlyReleaseEnabled && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {mod.release_date_calculated
                              ? `Unlocks ${new Date(mod.release_date_calculated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                              : 'Coming soon'}
                          </div>
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: 11, padding: '3px 10px', opacity: unlocking ? 0.6 : 1 }}
                            onClick={(e) => { e.stopPropagation(); handleUnlockEarlyAccess(); }}
                            disabled={unlocking}
                          >
                            {unlocking ? 'Unlocking…' : 'Unlock for early access'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saved content section */}
          {savedModules.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h4 style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)',
                fontFamily: 'var(--font-body)', fontWeight: 500, letterSpacing: '0.06em',
                textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#E11D48' }}>♥</span> Saved
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedModules.map(m => (
                  <div key={m.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {m.domain_name && (
                        <div style={{ fontSize: 11, color: 'var(--accent-dark)', fontWeight: 500, marginBottom: 2 }}>{m.domain_name}</div>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{m.title}</div>
                    </div>
                    <SaveButton moduleId={m.id} saved={true} onToggle={handleToggleSave} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Streak + Calendar */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ position: 'sticky', top: 24 }}>
            <StreakWidget modules={modules} />
            {hasCalendarData && (
              <>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)',
                  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Release Schedule
                </p>
                <MiniCalendar modules={modules} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Welcome card — floating bottom-right */}
      {showWelcome && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 300,
          background: '#F5F3FF',
          border: '1px solid #DDD6FE',
          borderRadius: 16,
          padding: '20px 22px',
          boxShadow: '0 8px 32px rgba(109,40,217,0.12)',
          zIndex: 50,
        }}>
          <button onClick={dismissWelcome} style={{
            position: 'absolute', top: 12, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9CA3AF', fontSize: 20, lineHeight: 1, padding: 0,
          }}>×</button>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B', marginBottom: 8 }}>
            Welcome — here's how this works
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '⊟', text: 'Each module has a short resource plus a quick check-in at the end.' },
              { icon: '◉', text: 'New modules release automatically — you\'ll get notified by email or text the moment they drop.' },
              { icon: '◈', text: 'Your login link works automatically — bookmark it for quick access anytime.' },
            ].map(({ icon, text }) => (
              <div key={icon} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1, color: '#7C3AED' }}>{icon}</span>
                <span style={{ fontSize: 12, color: '#3730A3', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
          <button
            onClick={dismissWelcome}
            style={{
              marginTop: 16, width: '100%', padding: '9px 16px',
              background: '#7C3AED', color: 'white', border: 'none',
              borderRadius: 100, fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            Got it — let's go →
          </button>
        </div>
      )}
    </div>
  );
}
