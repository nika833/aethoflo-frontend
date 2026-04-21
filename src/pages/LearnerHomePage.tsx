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

  const futureDates = Object.keys(releaseDates)
    .filter(d => d >= todayStr)
    .sort();

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

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 600, padding: '0 0 4px' }}>
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
            <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 3 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10,
                background: isToday ? 'var(--accent)' : 'transparent',
                color: isToday ? 'white' : hasRelease ? 'var(--accent-dark)' : 'var(--text-secondary)',
                fontWeight: isToday || hasRelease ? 600 : 400,
              }}>
                {day}
              </div>
              {hasRelease && (
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: allCompleted ? 'var(--status-completed)' : 'var(--accent)',
                  marginTop: 1,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {upcomingInMonth.length > 0 && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Upcoming
          </div>
          {upcomingInMonth.slice(0, 5).flatMap(dateStr => {
            const date = new Date(dateStr + 'T12:00:00');
            return (releaseDates[dateStr] || []).map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, minWidth: 32, flexShrink: 0, paddingTop: 1 }}>
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {m.title}
                </span>
              </div>
            ));
          })}
        </div>
      )}
    </div>
  );
}

export default function LearnerHomePage() {
  const [data, setData] = useState<LearnerHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(WELCOME_KEY));
  const [unlocking, setUnlocking] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(() => {
    learnerProgressApi.getMy()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_KEY, 'true');
    setShowWelcome(false);
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
    <div className="animate-fade-up" style={{ maxWidth: 900 }}>

      {/* First-login welcome card */}
      {showWelcome && (
        <div style={{
          background: 'var(--accent-light)',
          border: '1px solid var(--accent-mid)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          marginBottom: 28,
          position: 'relative',
        }}>
          <button onClick={dismissWelcome} style={{
            position: 'absolute', top: 12, right: 14,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', fontSize: 20, lineHeight: 1, padding: 0,
          }}>×</button>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
            Welcome — here's how this works
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Your roadmap is a sequence of focused modules — each one builds on the last. Work through them at your own pace.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '⊟', text: 'Each module has a short video or resource, plus a quick check-in at the end.' },
              { icon: '◉', text: 'Track your progress on the Progress tab anytime.' },
              { icon: '◈', text: 'Your link logs you in automatically — bookmark it so you can come back easily.' },
            ].map(({ icon, text }) => (
              <div key={icon} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={dismissWelcome}>
            Got it — let's go →
          </button>
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

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
            {/* Connecting line */}
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

                const circleBg = isCompleted
                  ? 'var(--status-completed)'
                  : isCurrent
                  ? 'var(--accent)'
                  : isLocked
                  ? 'var(--surface-3)'
                  : 'var(--accent-light)';

                const circleBorder = (!isCompleted && !isCurrent && !isLocked)
                  ? '2px solid var(--accent)'
                  : isLocked
                  ? '2px solid var(--border)'
                  : 'none';

                return (
                  <div key={mod.id} style={{ position: 'relative', animationDelay: `${idx * 30}ms` }}>
                    {/* Circle node */}
                    <div style={{
                      position: 'absolute',
                      left: -36,
                      top: 16,
                      width: 20, height: 20, borderRadius: '50%',
                      background: circleBg,
                      border: circleBorder,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                      color: isCompleted ? 'white' : isCurrent ? 'white' : 'var(--text-tertiary)',
                      zIndex: 1,
                      boxShadow: isCurrent ? '0 0 0 4px var(--accent-light)' : 'none',
                    }}>
                      {isCompleted ? '✓' : null}
                    </div>

                    {/* Module card */}
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
                      onMouseEnter={isClickable ? (e) => {
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateX(3px)';
                      } : undefined}
                      onMouseLeave={isClickable ? (e) => {
                        (e.currentTarget as HTMLDivElement).style.transform = '';
                      } : undefined}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {mod.domain_name && (
                            <div style={{
                              fontSize: 11, fontWeight: 500, marginBottom: 3, letterSpacing: '0.04em',
                              color: isLocked ? 'var(--text-tertiary)' : 'var(--accent-dark)',
                            }}>
                              {mod.domain_name}
                            </div>
                          )}
                          <div style={{
                            fontWeight: isCurrent ? 600 : 500,
                            fontSize: isCurrent ? 15 : 14,
                            color: isLocked ? 'var(--text-secondary)' : 'var(--text-primary)',
                            lineHeight: 1.3,
                          }}>
                            {mod.title}
                          </div>
                          {isCurrent && mod.objective && (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.5 }}>
                              {mod.objective}
                            </p>
                          )}
                        </div>
                        {isCompleted && (
                          <span style={{ fontSize: 11, color: 'var(--status-completed)', fontWeight: 600, flexShrink: 0, paddingTop: 2 }}>
                            Done
                          </span>
                        )}
                      </div>

                      {/* Current module CTA */}
                      {isCurrent && (
                        <div style={{ marginTop: 12 }}>
                          <button className="btn btn-primary btn-sm">
                            {mod.status === 'in_progress' ? 'Continue →' : 'Start module →'}
                          </button>
                        </div>
                      )}

                      {/* Locked: release date + early access */}
                      {isLocked && !earlyReleaseEnabled && (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          marginTop: 8, gap: 12, flexWrap: 'wrap',
                        }}>
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
        </div>

        {/* Right: Calendar */}
        {hasCalendarData && (
          <div style={{ width: 220, flexShrink: 0 }}>
            <div style={{ position: 'sticky', top: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)',
                letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Release Schedule
              </p>
              <MiniCalendar modules={modules} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
