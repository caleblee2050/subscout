'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { Icon } from '@iconify/react';

// ── Constants ──
const CAT = {
  streaming: '스트리밍', music: '음악', cloud: '클라우드',
  productivity: '생산성', ai: 'AI 서비스', design: '디자인',
  developer: '개발 도구', reading: '콘텐츠', membership: '멤버십',
  gaming: '게임', fitness: '피트니스', news: '뉴스',
  bundle: '번들', other: '기타',
};

const CAT_ICON = {
  streaming: 'solar:tv-bold-duotone', music: 'solar:music-note-bold-duotone',
  cloud: 'solar:cloud-bold-duotone', productivity: 'solar:bolt-bold-duotone',
  ai: 'solar:cpu-bold-duotone', design: 'solar:palette-bold-duotone',
  developer: 'solar:code-square-bold-duotone', reading: 'solar:book-bold-duotone',
  membership: 'solar:ticket-sale-bold-duotone', gaming: 'solar:gamepad-bold-duotone',
  fitness: 'solar:dumbbell-large-bold-duotone', news: 'solar:global-bold-duotone',
  bundle: 'solar:box-bold-duotone', other: 'solar:archive-bold-duotone',
};

const CYC = { monthly: '월', yearly: '연', weekly: '주' };
const fmt = (n) => new Intl.NumberFormat('ko-KR').format(n);

// ── API ──
const api = {
  get: (u) => fetch(u).then(r => r.json()),
  post: (u, d) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => r.json()),
  patch: (u, d) => fetch(u, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => r.json()),
  del: (u) => fetch(u, { method: 'DELETE' }).then(r => r.json()),
};

// ════════════════════ APP SHELL ════════════════════
export default function SubScoutApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [subs, setSubs] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, monthly_total: 0, yearly_total: 0 });
  const [toast, setToast] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const glowRef = useRef(null);

  // Cursor glow
  useEffect(() => {
    const move = (e) => {
      if (glowRef.current) {
        glowRef.current.style.left = e.clientX + 'px';
        glowRef.current.style.top = e.clientY + 'px';
      }
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(s => { setSession(s?.user ? s : null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const d = await api.get('/api/subscriptions');
      setSubs(d.subscriptions || []);
      setSummary(d.summary || { total: 0, active: 0, monthly_total: 0, yearly_total: 0 });
    } catch { }
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const flash = (msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon icon="svg-spinners:ring-resize" style={{ fontSize: 36, color: 'var(--accent)' }} />
    </div>
  );

  return (
    <>
      <div className="grid-bg" />
      <div className="cursor-glow" ref={glowRef} />

      {!session ? <Landing /> : (
        <div className="app-shell">
          <button className="mob-btn" onClick={() => setMenuOpen(!menuOpen)}>
            <Icon icon="solar:hamburger-menu-linear" />
          </button>

          <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
            <div className="logo">
              <div className="logo-mark"><Icon icon="solar:infinity-bold" /></div>
              <span className="logo-text">SubScout</span>
            </div>

            <nav className="nav">
              {[
                { id: 'dashboard', ic: 'solar:pie-chart-2-linear', icA: 'solar:pie-chart-2-bold', t: '대시보드' },
                { id: 'subscriptions', ic: 'solar:clipboard-list-linear', icA: 'solar:clipboard-list-bold', t: '구독 관리' },
                { id: 'scan', ic: 'solar:scanner-linear', icA: 'solar:scanner-bold', t: '스마트 스캔' },
                { id: 'analytics', ic: 'solar:chart-square-linear', icA: 'solar:chart-square-bold', t: '비용 분석' },
              ].map(n => (
                <button key={n.id} className={`nav-btn ${page === n.id ? 'active' : ''}`}
                  onClick={() => { setPage(n.id); setMenuOpen(false); }}>
                  <Icon icon={page === n.id ? n.icA : n.ic} className="icon" />
                  {n.t}
                </button>
              ))}
            </nav>

            <div className="profile">
              {session.user?.image ? <img src={session.user.image} className="avatar" alt="" /> : <div className="avatar" />}
              <div className="profile-info">
                <div className="profile-name">{session.user?.name}</div>
                <div className="profile-email">{session.user?.email}</div>
              </div>
              <button className="btn-icon" onClick={() => signOut()}><Icon icon="solar:logout-2-linear" style={{ fontSize: 18 }} /></button>
            </div>
          </aside>

          {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} style={{ zIndex: 40, background: 'rgba(0,0,0,0.5)' }} />}

          <main className="main">
            {page === 'dashboard' && <Dashboard subs={subs} summary={summary} go={setPage} />}
            {page === 'subscriptions' && <Subscriptions subs={subs} reload={load} flash={flash} />}
            {page === 'scan' && <Scan reload={load} flash={flash} />}
            {page === 'analytics' && <Analytics subs={subs} summary={summary} />}
          </main>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type === 'err' ? 'toast-err' : ''}`}>
          <Icon icon={toast.type === 'err' ? 'solar:danger-circle-bold' : 'solar:check-circle-bold'} style={{ fontSize: 20, color: toast.type === 'err' ? 'var(--red)' : 'var(--green)' }} />
          {toast.msg}
        </div>
      )}
    </>
  );
}

// ════════════════════ LANDING ════════════════════
function Landing() {
  return (
    <div className="landing">
      <nav className="land-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="logo-mark"><Icon icon="solar:infinity-bold" /></div>
          <span className="logo-text">SubScout</span>
        </div>
        <button className="btn btn-ghost" style={{ borderRadius: 'var(--r-pill)' }} onClick={() => signIn('google')}>
          <Icon icon="logos:google-icon" /> 시작하기
        </button>
      </nav>

      <section className="hero">
        <div className="hero-pill">
          <Icon icon="solar:shield-star-bold" style={{ color: 'var(--accent-soft)' }} />
          구독 관리의 새로운 기준
        </div>
        <h1>당신의 구독료,<br /><em>한눈에 파악하세요.</em></h1>
        <p>
          이메일 청구서를 자동으로 분석하고, 잊고 있던 정기 결제를 발견합니다.<br />
          직관적인 대시보드에서 모든 구독을 완벽하게 통제하세요.
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary" onClick={() => signIn('google')}>
            무료로 시작 <Icon icon="solar:arrow-right-line-duotone" />
          </button>
          <button className="btn btn-ghost">기능 둘러보기</button>
        </div>
      </section>

      {/* Interactive Preview Window */}
      <div className="preview-window">
        <div className="preview-frame">
          {/* Gradient glow behind */}
          <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 500, height: 160, background: 'radial-gradient(ellipse, var(--accent-glow), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
          <div className="preview-bar">
            <div className="preview-dot" /><div className="preview-dot" /><div className="preview-dot" />
            <span className="preview-url">subscout.app — 대시보드</span>
          </div>
          <div className="preview-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>이번 달 예상 청구</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>₩124,500</div>
              </div>
              <div className="badge" style={{ fontSize: 12, padding: '6px 14px' }}>활성 구독 7개</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { n: 'Netflix', c: 'streaming', a: 17000 },
                { n: 'ChatGPT Plus', c: 'ai', a: 28000 },
                { n: 'Figma', c: 'design', a: 18000 },
              ].map((m, i) => (
                <div key={i} style={{ padding: 16, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)' }}>
                  <Icon icon={CAT_ICON[m.c]} style={{ fontSize: 28, color: 'var(--accent-soft)', marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{m.n}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-mid)', fontVariantNumeric: 'tabular-nums' }}>₩{fmt(m.a)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards with Tilt */}
      <div className="features">
        {[
          { ic: 'solar:inbox-in-bold-duotone', t: '자동 이메일 분석', d: '수천 통의 인박스에서 결제 확인 메일만 추출하여 구독 내역을 자동 구축합니다.' },
          { ic: 'solar:chart-2-bold-duotone', t: '구독 비용 시각화', d: '월별, 카테고리별 지출을 한눈에 파악하고 불필요한 결제를 즉시 감지하세요.' },
          { ic: 'solar:shield-keyhole-bold-duotone', t: '프라이버시 우선 설계', d: 'Gmail Read-Only 권한만 사용하며, 민감한 데이터는 안전하게 처리됩니다.' },
        ].map((f, i) => (
          <div key={i} className="feat-card">
            <div className="feat-icon"><Icon icon={f.ic} /></div>
            <h3>{f.t}</h3>
            <p>{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════ DASHBOARD ════════════════════
function Dashboard({ subs, summary, go }) {
  const catData = {};
  const active = subs.filter(s => s.status === 'active');
  active.forEach(s => {
    const c = s.category || s.catalog_category || 'other';
    if (!catData[c]) catData[c] = { n: 0, t: 0 };
    catData[c].n++;
    catData[c].t += s.billing_cycle === 'yearly' ? Math.round(s.amount / 12)
      : s.billing_cycle === 'weekly' ? s.amount * 4 : s.amount;
  });
  const sorted = Object.entries(catData).sort((a, b) => b[1].t - a[1].t);

  return (
    <>
      <div className="header">
        <div>
          <h2 className="title">개요</h2>
          <p className="subtitle">이번 달 구독 현황을 한눈에 파악하세요.</p>
        </div>
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => go('scan')}><Icon icon="solar:scanner-linear" /> 스캔</button>
          <button className="btn btn-primary" onClick={() => go('subscriptions')}><Icon icon="solar:add-circle-bold" /> 추가</button>
        </div>
      </div>

      <div className="bento">
        <div className="glass col-8" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="stat-label"><Icon icon="solar:wallet-money-linear" /> 월 고정 지출</div>
            <div className="stat-num">₩{fmt(summary.monthly_total)}</div>
            <div className="stat-sub">연간 약 ₩{fmt(summary.yearly_total)}</div>
          </div>
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              <span>카테고리 비율</span>
              <span>{active.length}개 서비스</span>
            </div>
            <div className="bar-track" style={{ height: 8 }}>
              <div style={{ display: 'flex', height: '100%', borderRadius: 4, overflow: 'hidden' }}>
                {sorted.map(([c, d], i) => (
                  <div key={c} style={{
                    width: `${summary.monthly_total ? (d.t / summary.monthly_total) * 100 : 0}%`,
                    background: `hsl(${240 + i * 30}, 70%, ${65 - i * 5}%)`,
                    transition: 'width 0.8s var(--ease-out)',
                  }} title={`${CAT[c]}: ₩${fmt(d.t)}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="glass col-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="stat-label"><Icon icon="solar:layers-linear" /> 등록 구독</div>
          <div className="stat-num">{summary.active}<span style={{ fontSize: 24, color: 'var(--text-muted)' }}>/{summary.total}</span></div>
          <div className="stat-sub">현재 활성 서비스</div>
        </div>

        <div className="glass col-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>최근 내역</h3>
            <button className="btn-icon" onClick={() => go('subscriptions')}><Icon icon="solar:arrow-right-linear" /></button>
          </div>
          {subs.slice(0, 4).map(s => {
            const c = s.category || s.catalog_category || 'other';
            return (
              <div key={s.id} className="list-row" style={{ padding: '14px 0' }}>
                <div className="row-icon"><Icon icon={CAT_ICON[c]} /></div>
                <div className="row-body">
                  <div className="row-title">{s.custom_name || s.catalog_name || s.name_ko}</div>
                  <div className="row-meta"><span className="badge">{CAT[c]}</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="row-amount">₩{fmt(s.amount)}</div>
                  <div className="row-cycle">/{CYC[s.billing_cycle] || s.billing_cycle}</div>
                </div>
              </div>
            );
          })}
          {subs.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>아직 기록이 없습니다.</div>}
        </div>

        <div className="glass col-6">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 20 }}>카테고리별 비용</h3>
          {sorted.slice(0, 5).map(([c, d], i) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--glass-bg-active)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon={CAT_ICON[c]} style={{ fontSize: 18, color: `hsl(${240 + i * 30}, 70%, 65%)` }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{CAT[c]}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>₩{fmt(d.t)}</span>
                </div>
                <div className="bar-track" style={{ height: 4 }}>
                  <div className="bar-fill" style={{ width: `${summary.monthly_total ? (d.t / summary.monthly_total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          ))}
          {sorted.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>데이터 없음</div>}
        </div>
      </div>
    </>
  );
}

// ════════════════════ SUBSCRIPTIONS ════════════════════
function Subscriptions({ subs, reload, flash }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  const list = subs.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (q && !(s.custom_name || s.catalog_name || s.name_ko || '').toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const remove = async (id) => {
    if (!confirm('정말 삭제할까요?')) return;
    try { await api.del(`/api/subscriptions?id=${id}`); flash('삭제 완료'); setEdit(null); reload(); }
    catch { flash('삭제 실패', 'err'); }
  };

  return (
    <>
      <div className="header">
        <div><h2 className="title">구독 관리</h2><p className="subtitle">추적 중인 모든 결제를 조회하고 편집합니다.</p></div>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <Icon icon="solar:magnifer-linear" className="s-icon" />
          <input placeholder="검색..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="tab-bar">
            {[{ id: 'all', t: '전체' }, { id: 'active', t: '활성' }, { id: 'paused', t: '보류' }].map(f => (
              <div key={f.id} className={`tab ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>{f.t}</div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => setEdit({ _new: true })}>새 항목</button>
        </div>
      </div>

      <div className="glass" style={{ padding: '0 var(--s-xl)' }}>
        {list.length > 0 ? list.map(s => {
          const c = s.category || s.catalog_category || 'other';
          return (
            <div key={s.id} className="list-row" style={{ padding: '18px 0' }}>
              <div className="row-icon"><Icon icon={CAT_ICON[c]} /></div>
              <div className="row-body">
                <div className="row-title">{s.custom_name || s.catalog_name || s.name_ko || '(이름 없음)'}</div>
                <div className="row-meta">
                  <span className={`badge ${s.status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                    {s.status === 'active' ? '활성' : '보류'}
                  </span>
                  <span>{CAT[c]}</span>
                  {s.source === 'gmail' && <span><Icon icon="solar:letter-linear" style={{ fontSize: 14 }} /> 자동</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', marginRight: 'var(--s-lg)' }}>
                <div className="row-amount">₩{fmt(s.amount)}</div>
                <div className="row-cycle">매{CYC[s.billing_cycle]}</div>
              </div>
              <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setEdit(s)}>편집</button>
            </div>
          );
        }) : (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon icon="solar:ghost-bold-duotone" style={{ fontSize: 56, marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 15 }}>결과가 없습니다.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {edit && (
        <div className="overlay" onClick={() => setEdit(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{edit._new ? '새 구독 등록' : '구독 편집'}</h3>
              <button className="btn-icon" onClick={() => setEdit(null)}><Icon icon="solar:close-square-linear" style={{ fontSize: 24 }} /></button>
            </div>
            <div className="field">
              <label className="label">서비스 이름</label>
              <input className="input" id="f-name" defaultValue={edit.custom_name || edit.catalog_name || edit.name_ko || ''} />
            </div>
            <div className="field-row">
              <div className="field">
                <label className="label">금액 (₩)</label>
                <input type="number" className="input" id="f-amt" defaultValue={edit.amount || ''} />
              </div>
              <div className="field">
                <label className="label">결제 주기</label>
                <select className="select" id="f-cyc" defaultValue={edit.billing_cycle || 'monthly'}>
                  <option value="monthly">월별</option><option value="yearly">연별</option><option value="weekly">주별</option>
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="label">카테고리</label>
                <select className="select" id="f-cat" defaultValue={edit.category || 'other'}>
                  {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">결제일</label>
                <input type="number" className="input" id="f-day" placeholder="1~31" defaultValue={edit.billing_day || ''} />
              </div>
            </div>
            <div className="field">
              <label className="label">상태</label>
              <select className="select" id="f-st" defaultValue={edit.status || 'active'}>
                <option value="active">활성</option><option value="paused">보류</option><option value="cancelled">해지</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              {!edit._new && <button className="btn btn-ghost" style={{ flex: 1, color: 'var(--red)' }} onClick={() => remove(edit.id)}>삭제</button>}
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                const d = {
                  custom_name: document.getElementById('f-name').value,
                  amount: parseInt(document.getElementById('f-amt').value) || 0,
                  billing_cycle: document.getElementById('f-cyc').value,
                  category: document.getElementById('f-cat').value,
                  status: document.getElementById('f-st').value,
                  billing_day: parseInt(document.getElementById('f-day').value) || null,
                  source: edit._new ? 'manual' : edit.source,
                };
                if (!d.custom_name) return flash('이름을 입력하세요', 'err');
                try {
                  if (edit._new) { await api.post('/api/subscriptions', d); flash('등록 완료'); }
                  else { await api.patch('/api/subscriptions', { id: edit.id, ...d }); flash('수정 완료'); }
                  setEdit(null); reload();
                } catch { flash('실패', 'err'); }
              }}>
                {edit._new ? '등록' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════ SCAN ════════════════════
function Scan({ reload, flash }) {
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null);

  const scan = async () => {
    setState('run');
    try {
      const r = await api.post('/api/gmail/scan', { maxResults: 300, scanMonths: 3 });
      if (r.error) throw new Error(r.error);
      setResult(r); setState('done'); flash('분석 완료');
    } catch (e) { flash(e.message || '오류', 'err'); setState('idle'); }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--s-3xl)', paddingTop: 'var(--s-xl)' }}>
        <Icon icon="solar:radar-bold-duotone" style={{ fontSize: 52, color: 'var(--accent)', marginBottom: 16 }} />
        <h2 className="title" style={{ textAlign: 'center' }}>스마트 스캔</h2>
        <p className="subtitle">인박스 또는 카드 명세서에서 구독을 자동 추출합니다.</p>
      </div>

      {state === 'idle' && (
        <div className="scan-grid">
          <div className="scan-card" onClick={scan}>
            <Icon icon="solar:mailbox-bold-duotone" className="ic" />
            <h3>Gmail 동기화</h3>
            <p>청구서·영수증 메일을 분석합니다.</p>
          </div>
          <div className="scan-card scan-drop">
            <Icon icon="solar:document-medicine-bold-duotone" className="ic" style={{ color: 'var(--text-muted)' }} />
            <h3>파일 업로드</h3>
            <p>카드 명세서를 드래그 앤 드롭하세요.</p>
          </div>
        </div>
      )}

      {state === 'run' && (
        <div className="glass" style={{ textAlign: 'center', padding: '80px 0' }}>
          <Icon icon="svg-spinners:pulse-2" style={{ fontSize: 72, color: 'var(--accent)', marginBottom: 24 }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>분석 중...</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>메일함에서 결제 패턴을 매칭하고 있습니다.</p>
        </div>
      )}

      {state === 'done' && (
        <div className="glass">
          <div style={{ textAlign: 'center', marginBottom: 'var(--s-xl)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900 }}>{result.emails_found}건 감지</h3>
            <p style={{ color: 'var(--text-mid)', marginTop: 4 }}>아래 내역을 확인하고 저장하세요.</p>
          </div>
          <div style={{ border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {result.subscriptions?.map((s, i) => (
              <div key={i} className="list-row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                <div className="row-icon" style={{ background: 'transparent', border: 'none' }}><Icon icon={CAT_ICON[s.category || 'other']} /></div>
                <div className="row-body">
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{s.service_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>확신도: {Math.round(s.confidence * 100)}%</div>
                </div>
                <div style={{ textAlign: 'right', marginRight: 16 }}>
                  <div className="row-amount">₩{fmt(s.amount)}</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={async () => {
                  await api.post('/api/subscriptions', { custom_name: s.service_name, amount: s.amount, billing_cycle: 'monthly', category: s.category || 'other', status: 'active', source: 'gmail' });
                  flash(`${s.service_name} 저장됨`); reload();
                }}>저장</button>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--s-xl)' }}>
            <button className="btn btn-ghost" onClick={() => setState('idle')}>돌아가기</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════ ANALYTICS ════════════════════
function Analytics({ subs, summary }) {
  const active = subs.filter(s => s.status === 'active');
  const topCat = {};
  active.forEach(s => {
    const c = s.category || s.catalog_category || 'other';
    const m = s.billing_cycle === 'yearly' ? Math.round(s.amount / 12) : s.billing_cycle === 'weekly' ? s.amount * 4 : s.amount;
    topCat[c] = (topCat[c] || 0) + m;
  });
  const topKey = Object.entries(topCat).sort((a, b) => b[1] - a[1])[0];
  const topSub = [...active].sort((a, b) => b.amount - a.amount)[0];

  return (
    <>
      <div className="header">
        <div><h2 className="title">비용 분석</h2><p className="subtitle">지출 패턴 및 최적화 인사이트.</p></div>
      </div>
      <div className="bento">
        <div className="glass col-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="stat-label"><Icon icon="solar:calendar-minimalistic-linear" /> 월 청구</div>
          <div className="stat-num">₩{fmt(summary.monthly_total)}</div>
        </div>
        <div className="glass col-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="stat-label"><Icon icon="solar:graph-up-linear" /> 연간 추정</div>
          <div className="stat-num">₩{fmt(summary.yearly_total)}</div>
        </div>
        <div className="glass col-4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="stat-label"><Icon icon="solar:fire-bold-duotone" /> 최고 지출</div>
          <div className="stat-num" style={{ fontSize: 28 }}>{topSub ? (topSub.custom_name || topSub.catalog_name || '—') : '—'}</div>
          <div className="stat-sub">{topSub ? `₩${fmt(topSub.amount)}/월` : '데이터 없음'}</div>
        </div>

        <div className="glass col-12">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 24 }}>최적화 제안</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--s-md)' }}>
            {[
              { ic: 'solar:calendar-mark-linear', t: '연간 결제 전환', d: `고정 비용 상위 서비스를 연간 플랜으로 변경하면 평균 15~20% 절감이 가능합니다.` },
              { ic: 'solar:copy-linear', t: '중복 서비스 확인', d: `${topKey ? CAT[topKey[0]] : '동일'} 카테고리에 유사 기능의 서비스가 복수 등록되어 있습니다. 통합을 검토하세요.` },
              { ic: 'solar:eye-closed-linear', t: '비활성 감지', d: `최근 30일간 이용 흔적이 없는 서비스를 보류 처리하여 불필요한 지출을 차단하세요.` },
            ].map((c, i) => (
              <div key={i} style={{ padding: 'var(--s-lg)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-md)' }}>
                <Icon icon={c.ic} style={{ fontSize: 24, color: 'var(--accent-soft)', marginBottom: 12 }} />
                <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{c.t}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6 }}>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
