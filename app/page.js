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
const IC = {
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

const ap = {
  get: (u) => fetch(u).then(r => r.json()),
  post: (u, d) => fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => r.json()),
  patch: (u, d) => fetch(u, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(r => r.json()),
  del: (u) => fetch(u, { method: 'DELETE' }).then(r => r.json()),
};

// ════════════════════ SHELL ════════════════════
export default function SubScoutApp() {
  const [sess, setSess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pg, setPg] = useState('dashboard');
  const [subs, setSubs] = useState([]);
  const [sum, setSum] = useState({ total: 0, active: 0, monthly_total: 0, yearly_total: 0 });
  const [toast, setToast] = useState(null);
  const [mob, setMob] = useState(false);
  const glowRef = useRef(null);

  useEffect(() => {
    const m = (e) => { if (glowRef.current) { glowRef.current.style.left = e.clientX + 'px'; glowRef.current.style.top = e.clientY + 'px'; } };
    window.addEventListener('mousemove', m);
    return () => window.removeEventListener('mousemove', m);
  }, []);

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json())
      .then(s => { setSess(s?.user ? s : null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const load = useCallback(async () => {
    if (!sess) return;
    try { const d = await ap.get('/api/subscriptions'); setSubs(d.subscriptions || []); setSum(d.summary || sum); } catch { }
  }, [sess]);
  useEffect(() => { load(); }, [load]);

  const flash = (msg, type = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon icon="svg-spinners:ring-resize" style={{ fontSize: 36, color: 'var(--teal)' }} />
    </div>
  );

  return (
    <>
      <div className="glow" ref={glowRef} />
      {!sess ? <Landing /> : (
        <div className="shell">
          <button className="mob" onClick={() => setMob(!mob)}><Icon icon="solar:hamburger-menu-linear" /></button>

          <aside className={`side ${mob ? 'open' : ''}`}>
            <div className="brand">
              <div className="brand-mark"><Icon icon="solar:infinity-bold" /></div>
              <span className="brand-name">SubScout</span>
            </div>
            <nav className="snav">
              {[
                { id: 'dashboard', i: 'solar:pie-chart-2-linear', ia: 'solar:pie-chart-2-bold', t: '대시보드' },
                { id: 'subscriptions', i: 'solar:clipboard-list-linear', ia: 'solar:clipboard-list-bold', t: '구독 관리' },
                { id: 'scan', i: 'solar:scanner-linear', ia: 'solar:scanner-bold', t: '스마트 스캔' },
                { id: 'analytics', i: 'solar:chart-square-linear', ia: 'solar:chart-square-bold', t: '비용 분석' },
              ].map(n => (
                <button key={n.id} className={`snav-btn ${pg === n.id ? 'on' : ''}`}
                  onClick={() => { setPg(n.id); setMob(false); }}>
                  <Icon icon={pg === n.id ? n.ia : n.i} className="ic" />{n.t}
                </button>
              ))}
            </nav>
            <div className="prof">
              {sess.user?.image ? <img src={sess.user.image} className="prof-img" alt="" /> : <div className="prof-img" />}
              <div className="prof-info">
                <div className="prof-name">{sess.user?.name}</div>
                <div className="prof-mail">{sess.user?.email}</div>
              </div>
              <button className="btn-ic" onClick={() => signOut()}><Icon icon="solar:logout-2-linear" style={{ fontSize: 18 }} /></button>
            </div>
          </aside>

          {mob && <div className="ov" onClick={() => setMob(false)} style={{ zIndex: 40, background: 'rgba(0,0,0,0.5)' }} />}

          <main className="content">
            {pg === 'dashboard' && <Dash subs={subs} sum={sum} go={setPg} />}
            {pg === 'subscriptions' && <Subs subs={subs} reload={load} flash={flash} />}
            {pg === 'scan' && <Scan reload={load} flash={flash} />}
            {pg === 'analytics' && <Analytics subs={subs} sum={sum} />}
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
    <div className="land">
      <nav className="land-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="brand-mark"><Icon icon="solar:infinity-bold" /></div>
          <span className="brand-name">SubScout</span>
        </div>
        <button className="btn btn-soft" style={{ borderRadius: 'var(--r-pill)' }} onClick={() => signIn('google')}>
          <Icon icon="logos:google-icon" /> 시작하기
        </button>
      </nav>

      <section className="hero">
        <div className="hero-pill">
          <Icon icon="solar:shield-star-bold" style={{ color: 'var(--teal-light)' }} />
          스마트 구독 관리
        </div>
        <h1>당신의 구독료,<br /><em>한눈에 파악하세요.</em></h1>
        <p>이메일 청구서를 자동으로 분석하고, 잊고 있던 정기 결제를 발견합니다. 직관적인 대시보드에서 모든 구독을 완벽하게 통제하세요.</p>
        <div className="hero-cta">
          <button className="btn btn-fill" onClick={() => signIn('google')}>무료로 시작 <Icon icon="solar:arrow-right-line-duotone" /></button>
          <button className="btn btn-soft">기능 둘러보기</button>
        </div>
      </section>

      <div className="pw">
        <div className="pw-frame">
          <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 500, height: 160, background: 'radial-gradient(ellipse, var(--teal-glow), transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
          <div className="pw-chrome"><div className="pw-d" /><div className="pw-d" /><div className="pw-d" /><span className="pw-url">subscout.app — 대시보드</span></div>
          <div className="pw-body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>이번 달 예상 청구</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 400, fontStyle: 'italic', fontVariantNumeric: 'tabular-nums' }}>₩124,500</div>
              </div>
              <div className="tag" style={{ fontSize: 12, padding: '6px 14px' }}>활성 구독 7개</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { n: 'Netflix', c: 'streaming', a: 17000 },
                { n: 'ChatGPT Plus', c: 'ai', a: 28000 },
                { n: 'Figma', c: 'design', a: 18000 },
              ].map((m, i) => (
                <div key={i} style={{ padding: 16, background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                  <Icon icon={IC[m.c]} style={{ fontSize: 28, color: 'var(--seafoam)', marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{m.n}</div>
                  <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>₩{fmt(m.a)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="feats">
        {[
          { ic: 'solar:inbox-in-bold-duotone', t: '자동 이메일 분석', d: '수천 통의 인박스에서 결제 확인 메일만 추출하여 구독 내역을 자동 구축합니다.' },
          { ic: 'solar:chart-2-bold-duotone', t: '구독 비용 시각화', d: '월별, 카테고리별 지출을 한눈에 파악하고 불필요한 결제를 즉시 감지하세요.' },
          { ic: 'solar:shield-keyhole-bold-duotone', t: '프라이버시 우선 설계', d: 'Gmail Read-Only 권한만 사용하며, 민감한 데이터는 안전하게 처리됩니다.' },
        ].map((f, i) => (
          <div key={i} className="feat">
            <div className="feat-ic"><Icon icon={f.ic} /></div>
            <h3>{f.t}</h3>
            <p>{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════ DASHBOARD ════════════════════
function Dash({ subs, sum, go }) {
  const cats = {};
  const act = subs.filter(s => s.status === 'active');
  act.forEach(s => {
    const c = s.category || s.catalog_category || 'other';
    if (!cats[c]) cats[c] = { n: 0, t: 0 };
    cats[c].n++;
    cats[c].t += s.billing_cycle === 'yearly' ? Math.round(s.amount / 12) : s.billing_cycle === 'weekly' ? s.amount * 4 : s.amount;
  });
  const sorted = Object.entries(cats).sort((a, b) => b[1].t - a[1].t);

  return (
    <>
      <div className="pg-head">
        <div><h2 className="pg-title">Overview</h2><p className="pg-sub">이번 달 구독 현황을 한눈에 파악하세요.</p></div>
        <div className="acts">
          <button className="btn btn-soft" onClick={() => go('scan')}><Icon icon="solar:scanner-linear" /> 스캔</button>
          <button className="btn btn-fill" onClick={() => go('subscriptions')}><Icon icon="solar:add-circle-bold" /> 추가</button>
        </div>
      </div>

      <div className="grid">
        <div className="panel g8" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="st-label"><Icon icon="solar:wallet-money-linear" /> Monthly Spend</div>
            <div className="st-num">₩{fmt(sum.monthly_total)}</div>
            <div className="st-sub">연간 약 ₩{fmt(sum.yearly_total)}</div>
          </div>
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <span>Breakdown</span><span>{act.length} active</span>
            </div>
            <div className="bar-bg" style={{ height: 8 }}>
              <div style={{ display: 'flex', height: '100%', borderRadius: 4, overflow: 'hidden' }}>
                {sorted.map(([c, d], i) => (
                  <div key={c} style={{ width: `${sum.monthly_total ? (d.t / sum.monthly_total) * 100 : 0}%`, background: `hsl(${175 + i * 25}, 55%, ${55 - i * 6}%)`, transition: 'width 0.8s var(--ease)' }} title={`${CAT[c]}: ₩${fmt(d.t)}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel g4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="st-label"><Icon icon="solar:layers-linear" /> Subscriptions</div>
          <div className="st-num">{sum.active}<span style={{ fontSize: 24, color: 'var(--text-3)' }}>/{sum.total}</span></div>
          <div className="st-sub">현재 활성 서비스</div>
        </div>

        <div className="panel g6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontStyle: 'italic' }}>Latest</h3>
            <button className="btn-ic" onClick={() => go('subscriptions')}><Icon icon="solar:arrow-right-linear" /></button>
          </div>
          {subs.slice(0, 4).map(s => {
            const c = s.category || s.catalog_category || 'other';
            return (
              <div key={s.id} className="row">
                <div className="row-ic"><Icon icon={IC[c]} /></div>
                <div className="row-body">
                  <div className="row-name">{s.custom_name || s.catalog_name || s.name_ko}</div>
                  <div className="row-meta"><span className="tag">{CAT[c]}</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="row-amt">₩{fmt(s.amount)}</div>
                  <div className="row-cyc">/{CYC[s.billing_cycle] || s.billing_cycle}</div>
                </div>
              </div>
            );
          })}
          {subs.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>아직 기록이 없습니다.</div>}
        </div>

        <div className="panel g6">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontStyle: 'italic', marginBottom: 20 }}>By Category</h3>
          {sorted.slice(0, 5).map(([c, d], i) => (
            <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 'var(--r-sm)', background: 'var(--teal-bg)', border: '1px solid rgba(45,139,139,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon={IC[c]} style={{ fontSize: 18, color: `hsl(${175 + i * 25}, 55%, 60%)` }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{CAT[c]}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontVariantNumeric: 'tabular-nums' }}>₩{fmt(d.t)}</span>
                </div>
                <div className="bar-bg" style={{ height: 4 }}>
                  <div className="bar-val" style={{ width: `${sum.monthly_total ? (d.t / sum.monthly_total) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          ))}
          {sorted.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>데이터 없음</div>}
        </div>
      </div>
    </>
  );
}

// ════════════════════ SUBSCRIPTIONS ════════════════════
function Subs({ subs, reload, flash }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  const list = subs.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (q && !(s.custom_name || s.catalog_name || s.name_ko || '').toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const rm = async (id) => {
    if (!confirm('정말 삭제할까요?')) return;
    try { await ap.del(`/api/subscriptions?id=${id}`); flash('삭제 완료'); setEdit(null); reload(); }
    catch { flash('삭제 실패', 'err'); }
  };

  return (
    <>
      <div className="pg-head">
        <div><h2 className="pg-title">Subscriptions</h2><p className="pg-sub">추적 중인 결제를 관리합니다.</p></div>
      </div>

      <div className="tbar">
        <div className="sbox">
          <Icon icon="solar:magnifer-linear" className="si" />
          <input placeholder="검색..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="tabs">
            {[{ id: 'all', t: '전체' }, { id: 'active', t: '활성' }, { id: 'paused', t: '보류' }].map(f => (
              <div key={f.id} className={`tb ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>{f.t}</div>
            ))}
          </div>
          <button className="btn btn-fill" onClick={() => setEdit({ _new: true })}>새 항목</button>
        </div>
      </div>

      <div className="panel" style={{ padding: '0 var(--s-xl)' }}>
        {list.length > 0 ? list.map(s => {
          const c = s.category || s.catalog_category || 'other';
          return (
            <div key={s.id} className="row" style={{ padding: '18px 0' }}>
              <div className="row-ic"><Icon icon={IC[c]} /></div>
              <div className="row-body">
                <div className="row-name">{s.custom_name || s.catalog_name || s.name_ko || '(이름 없음)'}</div>
                <div className="row-meta">
                  <span className={`tag ${s.status === 'active' ? 'tag-ok' : 'tag-warn'}`}>{s.status === 'active' ? '활성' : '보류'}</span>
                  <span>{CAT[c]}</span>
                  {s.source === 'gmail' && <span><Icon icon="solar:letter-linear" style={{ fontSize: 14 }} /> 자동</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', marginRight: 'var(--s-lg)' }}>
                <div className="row-amt">₩{fmt(s.amount)}</div>
                <div className="row-cyc">매{CYC[s.billing_cycle]}</div>
              </div>
              <button className="btn btn-soft" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setEdit(s)}>편집</button>
            </div>
          );
        }) : (
          <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-3)' }}>
            <Icon icon="solar:ghost-bold-duotone" style={{ fontSize: 56, marginBottom: 12, opacity: 0.4 }} />
            <p style={{ fontSize: 15 }}>결과가 없습니다.</p>
          </div>
        )}
      </div>

      {edit && (
        <div className="ov" onClick={() => setEdit(null)}>
          <div className="mdl" onClick={e => e.stopPropagation()}>
            <div className="mdl-top">
              <h3>{edit._new ? '새 구독 등록' : '구독 편집'}</h3>
              <button className="btn-ic" onClick={() => setEdit(null)}><Icon icon="solar:close-square-linear" style={{ fontSize: 24 }} /></button>
            </div>
            <div className="fld">
              <label className="lbl">서비스 이름</label>
              <input className="inp" id="f-n" defaultValue={edit.custom_name || edit.catalog_name || edit.name_ko || ''} />
            </div>
            <div className="fld-row">
              <div className="fld"><label className="lbl">금액 (₩)</label><input type="number" className="inp" id="f-a" defaultValue={edit.amount || ''} /></div>
              <div className="fld"><label className="lbl">주기</label><select className="sel" id="f-c" defaultValue={edit.billing_cycle || 'monthly'}><option value="monthly">월별</option><option value="yearly">연별</option><option value="weekly">주별</option></select></div>
            </div>
            <div className="fld-row">
              <div className="fld"><label className="lbl">카테고리</label><select className="sel" id="f-t" defaultValue={edit.category || 'other'}>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="fld"><label className="lbl">결제일</label><input type="number" className="inp" id="f-d" placeholder="1~31" defaultValue={edit.billing_day || ''} /></div>
            </div>
            <div className="fld"><label className="lbl">상태</label><select className="sel" id="f-s" defaultValue={edit.status || 'active'}><option value="active">활성</option><option value="paused">보류</option><option value="cancelled">해지</option></select></div>
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              {!edit._new && <button className="btn btn-soft" style={{ flex: 1, color: 'var(--red)' }} onClick={() => rm(edit.id)}>삭제</button>}
              <button className="btn btn-fill" style={{ flex: 1 }} onClick={async () => {
                const d = {
                  custom_name: document.getElementById('f-n').value,
                  amount: parseInt(document.getElementById('f-a').value) || 0,
                  billing_cycle: document.getElementById('f-c').value,
                  category: document.getElementById('f-t').value,
                  status: document.getElementById('f-s').value,
                  billing_day: parseInt(document.getElementById('f-d').value) || null,
                  source: edit._new ? 'manual' : edit.source,
                };
                if (!d.custom_name) return flash('이름을 입력하세요', 'err');
                try {
                  if (edit._new) { await ap.post('/api/subscriptions', d); flash('등록 완료'); }
                  else { await ap.patch('/api/subscriptions', { id: edit.id, ...d }); flash('수정 완료'); }
                  setEdit(null); reload();
                } catch { flash('실패', 'err'); }
              }}>{edit._new ? '등록' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════ SCAN ════════════════════
function Scan({ reload, flash }) {
  const [st, setSt] = useState('idle');
  const [res, setRes] = useState(null);

  const go = async () => {
    setSt('run');
    try {
      const r = await ap.post('/api/gmail/scan', { maxResults: 300, scanMonths: 3 });
      if (r.error) throw new Error(r.error);
      setRes(r); setSt('done'); flash('분석 완료');
    } catch (e) { flash(e.message || '오류', 'err'); setSt('idle'); }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--s-3xl)', paddingTop: 'var(--s-xl)' }}>
        <Icon icon="solar:radar-bold-duotone" style={{ fontSize: 52, color: 'var(--teal)', marginBottom: 16 }} />
        <h2 className="pg-title" style={{ textAlign: 'center' }}>Smart Scan</h2>
        <p className="pg-sub">인박스 또는 카드 명세서에서 구독을 자동 추출합니다.</p>
      </div>

      {st === 'idle' && (
        <div className="scan-grid">
          <div className="sc" onClick={go}>
            <Icon icon="solar:mailbox-bold-duotone" className="i" />
            <h3>Gmail 동기화</h3>
            <p>청구서·영수증 메일을 분석합니다.</p>
          </div>
          <div className="sc sc-dash">
            <Icon icon="solar:document-medicine-bold-duotone" className="i" style={{ color: 'var(--text-3)' }} />
            <h3>파일 업로드</h3>
            <p>카드 명세서를 드래그 앤 드롭하세요.</p>
          </div>
        </div>
      )}

      {st === 'run' && (
        <div className="panel" style={{ textAlign: 'center', padding: '80px 0' }}>
          <Icon icon="svg-spinners:pulse-2" style={{ fontSize: 72, color: 'var(--teal)', marginBottom: 24 }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontStyle: 'italic' }}>분석 중...</h3>
          <p style={{ color: 'var(--text-3)', marginTop: 8 }}>메일함에서 결제 패턴을 매칭하고 있습니다.</p>
        </div>
      )}

      {st === 'done' && (
        <div className="panel">
          <div style={{ textAlign: 'center', marginBottom: 'var(--s-xl)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic' }}>{res.emails_found}건 감지</h3>
            <p style={{ color: 'var(--text-2)', marginTop: 4 }}>아래 내역을 확인하고 저장하세요.</p>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            {res.subscriptions?.map((s, i) => (
              <div key={i} className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <div className="row-ic" style={{ background: 'transparent', border: 'none' }}><Icon icon={IC[s.category || 'other']} /></div>
                <div className="row-body">
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{s.service_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>확신도: {Math.round(s.confidence * 100)}%</div>
                </div>
                <div style={{ textAlign: 'right', marginRight: 16 }}><div className="row-amt">₩{fmt(s.amount)}</div></div>
                <button className="btn btn-soft" style={{ padding: '6px 14px', fontSize: 13 }} onClick={async () => {
                  await ap.post('/api/subscriptions', { custom_name: s.service_name, amount: s.amount, billing_cycle: 'monthly', category: s.category || 'other', status: 'active', source: 'gmail' });
                  flash(`${s.service_name} 저장됨`); reload();
                }}>저장</button>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--s-xl)' }}>
            <button className="btn btn-soft" onClick={() => setSt('idle')}>돌아가기</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════ ANALYTICS ════════════════════
function Analytics({ subs, sum }) {
  const act = subs.filter(s => s.status === 'active');
  const tc = {};
  act.forEach(s => {
    const c = s.category || s.catalog_category || 'other';
    const m = s.billing_cycle === 'yearly' ? Math.round(s.amount / 12) : s.billing_cycle === 'weekly' ? s.amount * 4 : s.amount;
    tc[c] = (tc[c] || 0) + m;
  });
  const topK = Object.entries(tc).sort((a, b) => b[1] - a[1])[0];
  const topS = [...act].sort((a, b) => b.amount - a.amount)[0];

  return (
    <>
      <div className="pg-head"><div><h2 className="pg-title">Analytics</h2><p className="pg-sub">지출 패턴 및 최적화 인사이트.</p></div></div>
      <div className="grid">
        <div className="panel g4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="st-label"><Icon icon="solar:calendar-minimalistic-linear" /> Monthly</div>
          <div className="st-num">₩{fmt(sum.monthly_total)}</div>
        </div>
        <div className="panel g4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="st-label"><Icon icon="solar:graph-up-linear" /> Yearly</div>
          <div className="st-num">₩{fmt(sum.yearly_total)}</div>
        </div>
        <div className="panel g4" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="st-label"><Icon icon="solar:fire-bold-duotone" /> Top Spend</div>
          <div className="st-num" style={{ fontSize: 28 }}>{topS ? (topS.custom_name || topS.catalog_name || '—') : '—'}</div>
          <div className="st-sub">{topS ? `₩${fmt(topS.amount)}/월` : '—'}</div>
        </div>

        <div className="panel g12">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontStyle: 'italic', marginBottom: 24 }}>Insights</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--s-md)' }}>
            {[
              { ic: 'solar:calendar-mark-linear', t: '연간 결제 전환', d: '고정 비용 상위 서비스를 연간 플랜으로 변경하면 평균 15~20% 절감이 가능합니다.' },
              { ic: 'solar:copy-linear', t: '중복 서비스 확인', d: `${topK ? CAT[topK[0]] : '동일'} 카테고리에 유사 기능의 서비스가 복수 등록되어 있습니다.` },
              { ic: 'solar:eye-closed-linear', t: '비활성 감지', d: '최근 30일간 이용 흔적이 없는 서비스를 보류 처리하여 불필요한 지출을 차단하세요.' },
            ].map((c, i) => (
              <div key={i} style={{ padding: 'var(--s-lg)', background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <Icon icon={c.ic} style={{ fontSize: 24, color: 'var(--seafoam)', marginBottom: 12 }} />
                <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{c.t}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
