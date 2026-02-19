'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn, signOut } from 'next-auth/react';

// ==================== UTILITIES ====================
const CATEGORY_LABELS = {
  streaming: '스트리밍', music: '음악', cloud: '클라우드',
  productivity: '생산성', ai: 'AI', design: '디자인',
  developer: '개발', reading: '독서', membership: '멤버십',
  gaming: '게임', fitness: '운동', news: '뉴스',
  bundle: '번들', other: '기타',
};

const CATEGORY_ICONS = {
  streaming: '📺', music: '🎵', cloud: '☁️',
  productivity: '⚡', ai: '🤖', design: '🎨',
  developer: '💻', reading: '📚', membership: '🏷️',
  gaming: '🎮', fitness: '💪', news: '📰',
  bundle: '📦', other: '📌',
};

const CYCLE_LABELS = { monthly: '월', yearly: '연', weekly: '주' };

function formatCurrency(amount) {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

function getCategoryColor(cat) {
  return `cat-${cat || 'other'}`;
}

// ==================== API HELPERS ====================
async function apiGet(url) {
  const res = await fetch(url);
  return res.json();
}

async function apiPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function apiPatch(url, data) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE' });
  return res.json();
}

// ==================== MAIN APP ====================
export default function SubScoutApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [subscriptions, setSubscriptions] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, monthly_total: 0, yearly_total: 0 });
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check session
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(s => {
        setSession(s?.user ? s : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Load subscriptions
  const loadSubscriptions = useCallback(async () => {
    if (!session) return;
    try {
      const data = await apiGet('/api/subscriptions');
      setSubscriptions(data.subscriptions || []);
      setSummary(data.summary || { total: 0, active: 0, monthly_total: 0, yearly_total: 0 });
    } catch (e) {
      console.error('Failed to load subscriptions:', e);
    }
  }, [session]);

  useEffect(() => { loadSubscriptions(); }, [loadSubscriptions]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div className="scan-spinner" />
      </div>
    );
  }

  if (!session) {
    return <LandingPage />;
  }

  return (
    <div className="app-container">
      {/* Mobile menu button */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🔍</div>
          <h1>SubScout</h1>
        </div>

        <nav className="sidebar-nav">
          {[
            { id: 'dashboard', icon: '📊', label: '대시보드' },
            { id: 'subscriptions', icon: '📋', label: '구독 목록' },
            { id: 'scan', icon: '🔎', label: '구독 찾기' },
            { id: 'analytics', icon: '📈', label: '비용 분석' },
          ].map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          {session.user?.image && <img src={session.user.image} alt="" />}
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{session.user?.name}</div>
            <div className="sidebar-user-email">{session.user?.email}</div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="main-content">
        {currentPage === 'dashboard' && (
          <DashboardPage
            subscriptions={subscriptions}
            summary={summary}
            onNavigate={setCurrentPage}
          />
        )}
        {currentPage === 'subscriptions' && (
          <SubscriptionsPage
            subscriptions={subscriptions}
            onRefresh={loadSubscriptions}
            showToast={showToast}
          />
        )}
        {currentPage === 'scan' && (
          <ScanPage
            onRefresh={loadSubscriptions}
            showToast={showToast}
          />
        )}
        {currentPage === 'analytics' && (
          <AnalyticsPage
            subscriptions={subscriptions}
            summary={summary}
          />
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </div>
  );
}

// ==================== LANDING PAGE ====================
function LandingPage() {
  return (
    <div className="landing">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-icon">🔍</div>
          <h1>SubScout</h1>
        </div>
        <button className="btn btn-primary" onClick={() => signIn('google')}>
          시작하기
        </button>
      </nav>

      <section className="hero">
        <div className="hero-badge">
          ✨ 당신의 구독, 한눈에 관리하세요
        </div>

        <h2>
          흩어진 <span className="gradient-text">디지털 구독</span>을<br />
          자동으로 찾아드립니다
        </h2>

        <p className="hero-description">
          Gmail을 스캔해서 숨어있는 구독을 발견하고,<br />
          매월 얼마나 지출하는지 한눈에 파악하세요.
        </p>

        <div className="hero-cta">
          <button className="btn btn-primary btn-lg" onClick={() => signIn('google')}>
            🔑 Google로 시작하기
          </button>
        </div>

        <div className="hero-features">
          <div className="card card-glass hero-feature">
            <div className="hero-feature-icon">📧</div>
            <h3>이메일 자동 스캔</h3>
            <p>Gmail에서 결제 영수증과 구독 확인 이메일을 AI가 자동으로 분석합니다</p>
          </div>
          <div className="card card-glass hero-feature">
            <div className="hero-feature-icon">💰</div>
            <h3>비용 분석</h3>
            <p>월별, 카테고리별 구독 비용을 시각화하고 절약 포인트를 제안합니다</p>
          </div>
          <div className="card card-glass hero-feature">
            <div className="hero-feature-icon">💳</div>
            <h3>카드 내역 분석</h3>
            <p>카드 명세서를 업로드하면 AI가 정기 결제를 자동으로 식별합니다</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// ==================== DASHBOARD PAGE ====================
function DashboardPage({ subscriptions, summary, onNavigate }) {
  const activeSubsByCategory = {};
  subscriptions.filter(s => s.status === 'active').forEach(s => {
    const cat = s.category || s.catalog_category || 'other';
    if (!activeSubsByCategory[cat]) activeSubsByCategory[cat] = { count: 0, total: 0 };
    activeSubsByCategory[cat].count++;
    const monthlyAmount = s.billing_cycle === 'yearly' ? Math.round(s.amount / 12)
      : s.billing_cycle === 'weekly' ? s.amount * 4 : s.amount;
    activeSubsByCategory[cat].total += monthlyAmount;
  });

  const recentSubs = subscriptions.slice(0, 5);

  return (
    <>
      <div className="page-header">
        <h2>대시보드</h2>
        <p>구독 현황을 한눈에 확인하세요</p>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="card summary-card">
          <div className="summary-label">월간 총 비용</div>
          <div className="summary-value" style={{ color: 'var(--accent-primary-light)' }}>
            ₩{formatCurrency(summary.monthly_total)}
          </div>
          <div className="summary-sub">연간 약 ₩{formatCurrency(summary.yearly_total)}</div>
        </div>
        <div className="card summary-card accent-cyan">
          <div className="summary-label">활성 구독</div>
          <div className="summary-value">{summary.active}개</div>
          <div className="summary-sub">전체 {summary.total}개 중</div>
        </div>
        <div className="card summary-card accent-green">
          <div className="summary-label">카테고리</div>
          <div className="summary-value">{Object.keys(activeSubsByCategory).length}개</div>
          <div className="summary-sub">분야에 걸쳐 구독 중</div>
        </div>
        <div className="card summary-card accent-amber">
          <div className="summary-label">평균 구독료</div>
          <div className="summary-value">
            ₩{formatCurrency(summary.active > 0 ? Math.round(summary.monthly_total / summary.active) : 0)}
          </div>
          <div className="summary-sub">구독당 월 평균</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <button className="btn btn-primary" onClick={() => onNavigate('scan')}>
          🔎 구독 찾기
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('subscriptions')}>
          ➕ 수동 추가
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('analytics')}>
          📈 비용 분석
        </button>
      </div>

      <div className="analytics-grid">
        {/* Category Breakdown */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-lg)' }}>카테고리별 지출</h3>
          <div className="bar-chart">
            {Object.entries(activeSubsByCategory)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([cat, data]) => (
                <div className="bar-row" key={cat}>
                  <div className="bar-label">
                    {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat] || cat}
                  </div>
                  <div className="bar-track">
                    <div
                      className={`bar-fill`}
                      style={{
                        width: `${summary.monthly_total > 0 ? (data.total / summary.monthly_total) * 100 : 0}%`,
                        background: `var(--cat-${cat})`
                      }}
                    />
                  </div>
                  <div className="bar-value">₩{formatCurrency(data.total)}</div>
                </div>
              ))}
            {Object.keys(activeSubsByCategory).length === 0 && (
              <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-lg)' }}>
                구독을 추가하면 여기에 표시됩니다
              </p>
            )}
          </div>
        </div>

        {/* Recent Subscriptions */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-lg)' }}>최근 구독</h3>
          {recentSubs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {recentSubs.map(sub => (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                    padding: 'var(--space-sm) 0',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    className="sub-icon"
                    style={{ width: 36, height: 36, fontSize: 16, background: `rgba(var(--cat-${sub.category || 'other'}), 0.1)` }}
                  >
                    {CATEGORY_ICONS[sub.category || sub.catalog_category || 'other']}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{sub.custom_name || sub.catalog_name || sub.name_ko}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      <span className={`cat-badge ${getCategoryColor(sub.category || sub.catalog_category)}`}>
                        {CATEGORY_LABELS[sub.category || sub.catalog_category] || '기타'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14 }}>
                    ₩{formatCurrency(sub.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
              <p style={{ fontSize: 13 }}>아직 등록된 구독이 없습니다</p>
              <button className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }} onClick={() => onNavigate('scan')}>
                🔎 구독 찾기
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ==================== SUBSCRIPTIONS PAGE ====================
function SubscriptionsPage({ subscriptions, onRefresh, showToast }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editSub, setEditSub] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  const filtered = subscriptions.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (s.custom_name || s.catalog_name || s.name_ko || '').toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  const handleDelete = async (id) => {
    try {
      await apiDelete(`/api/subscriptions?id=${id}`);
      showToast('구독이 삭제되었습니다');
      setDeleting(null);
      onRefresh();
    } catch (e) {
      showToast('삭제 실패', 'error');
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>구독 목록</h2>
        <p>등록된 모든 구독을 관리하세요</p>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="구독 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-chips">
            {[
              { id: 'all', label: '전체' },
              { id: 'active', label: '활성' },
              { id: 'paused', label: '일시중지' },
              { id: 'cancelled', label: '취소됨' },
            ].map(f => (
              <button
                key={f.id}
                className={`chip ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            ➕ 구독 추가
          </button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="sub-grid">
          {filtered.map(sub => (
            <div key={sub.id} className="card sub-card">
              <div
                className="sub-icon"
                style={{ background: `var(--cat-${sub.category || sub.catalog_category || 'other'})22` }}
              >
                {CATEGORY_ICONS[sub.category || sub.catalog_category || 'other']}
              </div>
              <div className="sub-info">
                <div className="sub-name">{sub.custom_name || sub.catalog_name || sub.name_ko || '알 수 없음'}</div>
                <div className="sub-meta">
                  <span className={`cat-badge ${getCategoryColor(sub.category || sub.catalog_category)}`}>
                    {CATEGORY_LABELS[sub.category || sub.catalog_category] || '기타'}
                  </span>
                  <span className={`status-badge status-${sub.status}`}>
                    {sub.status === 'active' ? '활성' : sub.status === 'paused' ? '일시중지' : '취소됨'}
                  </span>
                  {sub.source === 'gmail' && (
                    <span className="confidence" title={`신뢰도: ${Math.round((sub.confidence || 0) * 100)}%`}>
                      📧
                    </span>
                  )}
                </div>
              </div>
              <div className="sub-amount">
                <div className="sub-price">₩{formatCurrency(sub.amount)}</div>
                <div className="sub-cycle">/{CYCLE_LABELS[sub.billing_cycle] || sub.billing_cycle}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="btn btn-ghost btn-icon" onClick={() => setEditSub(sub)} title="수정">✏️</button>
                {deleting === sub.id ? (
                  <div className="confirm-row" style={{ flexDirection: 'column' }}>
                    <button className="btn btn-danger" onClick={() => handleDelete(sub.id)} style={{ fontSize: 11, padding: '2px 6px' }}>확인</button>
                    <button className="btn btn-ghost" onClick={() => setDeleting(null)} style={{ fontSize: 11, padding: '2px 6px' }}>취소</button>
                  </div>
                ) : (
                  <button className="btn btn-ghost btn-icon" onClick={() => setDeleting(sub.id)} title="삭제">🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>구독이 없습니다</h3>
          <p>Gmail 스캔으로 구독을 자동으로 찾거나 수동으로 추가해보세요</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            ➕ 구독 추가
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editSub) && (
        <SubscriptionModal
          subscription={editSub}
          onClose={() => { setShowAddModal(false); setEditSub(null); }}
          onSave={async (data) => {
            try {
              if (editSub) {
                await apiPatch('/api/subscriptions', { id: editSub.id, ...data });
                showToast('구독이 수정되었습니다');
              } else {
                await apiPost('/api/subscriptions', data);
                showToast('구독이 추가되었습니다');
              }
              setShowAddModal(false);
              setEditSub(null);
              onRefresh();
            } catch (e) {
              showToast('저장 실패', 'error');
            }
          }}
        />
      )}
    </>
  );
}

// ==================== SUBSCRIPTION MODAL ====================
function SubscriptionModal({ subscription, onClose, onSave }) {
  const [name, setName] = useState(subscription?.custom_name || subscription?.catalog_name || '');
  const [amount, setAmount] = useState(subscription?.amount || '');
  const [cycle, setCycle] = useState(subscription?.billing_cycle || 'monthly');
  const [category, setCategory] = useState(subscription?.category || subscription?.catalog_category || 'other');
  const [status, setStatus] = useState(subscription?.status || 'active');
  const [billingDay, setBillingDay] = useState(subscription?.billing_day || '');
  const [notes, setNotes] = useState(subscription?.notes || '');
  const [catalogSuggestions, setCatalogSuggestions] = useState([]);

  const searchCatalog = async (q) => {
    if (q.length < 1) { setCatalogSuggestions([]); return; }
    const data = await apiGet(`/api/catalog?q=${encodeURIComponent(q)}`);
    setCatalogSuggestions(data.services || []);
  };

  const selectCatalog = (service) => {
    setName(service.name_ko || service.name);
    setCategory(service.category || 'other');
    if (service.typical_price_krw) setAmount(service.typical_price_krw);
    if (service.billing_cycle) setCycle(service.billing_cycle);
    setCatalogSuggestions([]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{subscription ? '구독 수정' : '새 구독 추가'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">서비스명</label>
          <input
            className="form-input"
            placeholder="Netflix, YouTube Premium..."
            value={name}
            onChange={e => { setName(e.target.value); searchCatalog(e.target.value); }}
          />
          {catalogSuggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
              background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)', marginTop: 4, maxHeight: 200, overflowY: 'auto',
            }}>
              {catalogSuggestions.map(s => (
                <div
                  key={s.id}
                  style={{
                    padding: '8px 12px', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: 13,
                  }}
                  onClick={() => selectCatalog(s)}
                  onMouseEnter={e => e.target.style.background = 'var(--bg-glass-hover)'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}
                >
                  <span>{CATEGORY_ICONS[s.category]} {s.name_ko || s.name}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>₩{formatCurrency(s.typical_price_krw)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">금액 (원)</label>
            <input
              className="form-input"
              type="number"
              placeholder="10,000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">결제 주기</label>
            <select className="form-select" value={cycle} onChange={e => setCycle(e.target.value)}>
              <option value="monthly">월간</option>
              <option value="yearly">연간</option>
              <option value="weekly">주간</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">카테고리</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{CATEGORY_ICONS[key]} {label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">결제일</label>
            <input
              className="form-input"
              type="number"
              min="1" max="31"
              placeholder="1~31"
              value={billingDay}
              onChange={e => setBillingDay(e.target.value)}
            />
          </div>
        </div>

        {subscription && (
          <div className="form-group">
            <label className="form-label">상태</label>
            <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="active">활성</option>
              <option value="paused">일시중지</option>
              <option value="cancelled">취소됨</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">메모</label>
          <input
            className="form-input"
            placeholder="메모를 입력하세요..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button
            className="btn btn-primary"
            onClick={() => onSave({
              custom_name: name,
              amount: parseInt(amount) || 0,
              billing_cycle: cycle,
              category,
              status,
              billing_day: parseInt(billingDay) || null,
              notes,
              source: 'manual',
            })}
          >
            {subscription ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== SCAN PAGE ====================
function ScanPage({ onRefresh, showToast }) {
  const [scanMethod, setScanMethod] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [maxResults, setMaxResults] = useState(200);
  const [scanMonths, setScanMonths] = useState(6);

  const startGmailScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/gmail/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxResults, scanMonths }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScanResult(data);
      showToast(data.message || '스캔 완료!');
    } catch (e) {
      showToast(e.message || '스캔 실패', 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/card-analysis', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setScanResult(data);
      showToast(data.message || '분석 완료!');
    } catch (e) {
      showToast(e.message || '분석 실패', 'error');
    } finally {
      setScanning(false);
    }
  };

  const addDiscovered = async (sub) => {
    try {
      await apiPost('/api/subscriptions', {
        custom_name: sub.service_name,
        service_id: sub.catalog?.id || null,
        amount: sub.amount || sub.catalog?.typical_price_krw || 0,
        billing_cycle: sub.billing_cycle || 'monthly',
        category: sub.category || sub.catalog?.category || 'other',
        source: scanMethod === 'gmail' ? 'gmail' : 'card_statement',
        confidence: sub.confidence || 0.8,
      });
      showToast(`${sub.service_name}이(가) 추가되었습니다`);
      // Mark as added
      setScanResult(prev => ({
        ...prev,
        subscriptions: prev.subscriptions.map(s =>
          s === sub ? { ...s, already_tracked: true } : s
        ),
      }));
      onRefresh();
    } catch (e) {
      showToast('추가 실패', 'error');
    }
  };

  const SCAN_PRESETS = [
    { label: '50개', value: 50 },
    { label: '100개', value: 100 },
    { label: '200개', value: 200 },
    { label: '500개', value: 500 },
    { label: '1,000개', value: 1000 },
  ];

  const MONTH_PRESETS = [
    { label: '1개월', value: 1 },
    { label: '3개월', value: 3 },
    { label: '6개월', value: 6 },
    { label: '12개월', value: 12 },
    { label: '24개월', value: 24 },
  ];

  return (
    <div className="scan-container">
      <div className="page-header">
        <h2>구독 찾기</h2>
        <p>이메일 스캔이나 카드 명세서 분석으로 숨은 구독을 발견하세요</p>
      </div>

      {!scanning && !scanResult && (
        <>
          <div className="scan-methods">
            <div
              className={`card scan-method ${scanMethod === 'gmail' ? 'active' : ''}`}
              onClick={() => setScanMethod('gmail')}
            >
              <div className="scan-method-icon">📧</div>
              <h3>Gmail 스캔</h3>
              <p>이메일에서 구독 영수증과 결제 알림을 AI가 자동으로 분석합니다</p>
            </div>
            <div
              className={`card scan-method ${scanMethod === 'card' ? 'active' : ''}`}
              onClick={() => setScanMethod('card')}
            >
              <div className="scan-method-icon">💳</div>
              <h3>카드 명세서 분석</h3>
              <p>카드 명세서(CSV, TXT)를 업로드하면 정기 결제를 자동으로 식별합니다</p>
            </div>
          </div>

          {scanMethod === 'gmail' && (
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              {/* Scan Settings */}
              <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, marginBottom: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                  ⚙️ 스캔 설정
                </h4>

                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📬 스캔할 이메일 수</label>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)' }}>{maxResults.toLocaleString()}개</span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                    {SCAN_PRESETS.map(p => (
                      <button
                        key={p.value}
                        className={`btn ${maxResults === p.value ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 12, padding: '6px 12px', flex: '1 1 auto', minWidth: 60 }}
                        onClick={() => setMaxResults(p.value)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📅 스캔 기간</label>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)' }}>{scanMonths}개월</span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                    {MONTH_PRESETS.map(p => (
                      <button
                        key={p.value}
                        className={`btn ${scanMonths === p.value ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: 12, padding: '6px 12px', flex: '1 1 auto', minWidth: 60 }}
                        onClick={() => setScanMonths(p.value)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 'var(--space-md)', lineHeight: 1.5 }}>
                  💡 이메일 수가 많을수록 정확도가 높아지지만 분석 시간이 길어집니다.
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <button className="btn btn-primary btn-lg" onClick={startGmailScan}>
                  🔎 Gmail 스캔 시작 ({maxResults.toLocaleString()}개 · {scanMonths}개월)
                </button>
              </div>
            </div>
          )}

          {scanMethod === 'card' && (
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('file-input').click()}
            >
              <div className="drop-zone-icon">📄</div>
              <h3>카드 명세서를 여기에 드롭하세요</h3>
              <p>CSV, TXT 파일을 지원합니다</p>
              <input
                id="file-input"
                type="file"
                accept=".csv,.txt,.pdf"
                style={{ display: 'none' }}
                onChange={handleFileDrop}
              />
            </div>
          )}
        </>
      )}

      {scanning && (
        <div className="scan-progress">
          <div className="scan-spinner" />
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-sm)' }}>
            {scanMethod === 'gmail' ? '이메일을 분석하고 있습니다...' : '명세서를 분석하고 있습니다...'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {scanMethod === 'gmail'
              ? `최대 ${maxResults.toLocaleString()}개의 이메일을 AI가 분석합니다. 잠시만 기다려주세요.`
              : 'AI가 구독 패턴을 식별하고 있습니다. 잠시만 기다려주세요.'
            }
          </p>
        </div>
      )}

      {scanResult && !scanning && (
        <>
          <div className="card" style={{ textAlign: 'center', marginBottom: 'var(--space-lg)', padding: 'var(--space-lg)' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18 }}>{scanResult.message}</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-lg)', marginTop: 'var(--space-sm)' }}>
              {scanResult.emails_found > 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  📬 발견: {scanResult.emails_found}개
                </p>
              )}
              {scanResult.emails_scanned > 0 && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  🔍 분석: {scanResult.emails_scanned}개
                </p>
              )}
              {scanResult.scan_months && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  📅 기간: {scanResult.scan_months}개월
                </p>
              )}
            </div>
          </div>

          <div className="discovered-list">
            {scanResult.subscriptions?.map((sub, i) => (
              <div key={i} className="card discovered-item" style={{ flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', width: '100%' }}>
                  <div
                    className="sub-icon"
                    style={{ background: `var(--cat-${sub.category || 'other'})22` }}
                  >
                    {CATEGORY_ICONS[sub.category || 'other']}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{sub.service_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`cat-badge ${getCategoryColor(sub.category)}`}>
                        {CATEGORY_LABELS[sub.category] || '기타'}
                      </span>
                      {sub.confidence && (
                        <span className={`confidence ${sub.confidence > 0.8 ? 'confidence-high' : sub.confidence > 0.5 ? 'confidence-medium' : 'confidence-low'}`}>
                          신뢰도 {Math.round(sub.confidence * 100)}%
                          <span className="confidence-bar">
                            <span className="confidence-fill" style={{ width: `${sub.confidence * 100}%` }} />
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, marginRight: 'var(--space-md)', textAlign: 'right' }}>
                    {sub.amount > 0 ? `₩${formatCurrency(sub.amount)}` : '—'}
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 4 }}>
                      /{CYCLE_LABELS[sub.billing_cycle] || '월'}
                    </span>
                  </div>
                  <div>
                    {sub.already_tracked ? (
                      <span style={{ color: 'var(--accent-success)', fontSize: 13, fontWeight: 500 }}>✅ 추가됨</span>
                    ) : (
                      <button className="btn btn-primary" onClick={() => addDiscovered(sub)}>
                        ➕ 추가
                      </button>
                    )}
                  </div>
                </div>

                {/* Source email info with Gmail link */}
                {(sub.gmail_link || sub.source_subject) && (
                  <div style={{
                    width: '100%',
                    paddingTop: 'var(--space-sm)',
                    borderTop: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    fontSize: 12,
                    color: 'var(--text-tertiary)',
                  }}>
                    <span>📩</span>
                    {sub.gmail_link ? (
                      <a
                        href={sub.gmail_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: 'var(--accent-primary)',
                          textDecoration: 'none',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={sub.source_subject || '원본 이메일 보기'}
                      >
                        {sub.source_subject || '원본 이메일 보기'}
                      </a>
                    ) : (
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sub.source_subject}
                      </span>
                    )}
                    {sub.source_date && (
                      <span style={{ flexShrink: 0 }}>
                        {new Date(sub.source_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
            <button className="btn btn-secondary" onClick={() => { setScanResult(null); setScanMethod(null); }}>
              다시 스캔
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ==================== ANALYTICS PAGE ====================
function AnalyticsPage({ subscriptions, summary }) {
  const activeSubsByCategory = {};
  const activeSubs = subscriptions.filter(s => s.status === 'active');

  activeSubs.forEach(s => {
    const cat = s.category || s.catalog_category || 'other';
    if (!activeSubsByCategory[cat]) activeSubsByCategory[cat] = { count: 0, total: 0, subs: [] };
    const monthlyAmount = s.billing_cycle === 'yearly' ? Math.round(s.amount / 12)
      : s.billing_cycle === 'weekly' ? s.amount * 4 : s.amount;
    activeSubsByCategory[cat].count++;
    activeSubsByCategory[cat].total += monthlyAmount;
    activeSubsByCategory[cat].subs.push({ ...s, monthlyAmount });
  });

  const topExpenses = activeSubs
    .map(s => ({
      ...s,
      monthlyAmount: s.billing_cycle === 'yearly' ? Math.round(s.amount / 12)
        : s.billing_cycle === 'weekly' ? s.amount * 4 : s.amount,
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

  const maxAmount = topExpenses[0]?.monthlyAmount || 1;

  return (
    <>
      <div className="page-header">
        <h2>비용 분석</h2>
        <p>구독 비용의 흐름을 이해하세요</p>
      </div>

      {/* Cost Summary */}
      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card summary-card">
          <div className="summary-label">월간 지출</div>
          <div className="summary-value" style={{ color: 'var(--accent-primary-light)' }}>
            ₩{formatCurrency(summary.monthly_total)}
          </div>
        </div>
        <div className="card summary-card accent-cyan">
          <div className="summary-label">연간 지출</div>
          <div className="summary-value">₩{formatCurrency(summary.yearly_total)}</div>
        </div>
        <div className="card summary-card accent-amber">
          <div className="summary-label">일일 비용</div>
          <div className="summary-value">₩{formatCurrency(Math.round(summary.monthly_total / 30))}</div>
          <div className="summary-sub">하루에</div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Top Expenses */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-lg)' }}>비용 순위</h3>
          <div className="bar-chart">
            {topExpenses.slice(0, 10).map((sub, i) => (
              <div className="bar-row" key={sub.id || i}>
                <div className="bar-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 11, width: 16 }}>{i + 1}.</span>
                  {sub.custom_name || sub.catalog_name || sub.name_ko}
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(sub.monthlyAmount / maxAmount) * 100}%`,
                      background: `var(--cat-${sub.category || sub.catalog_category || 'other'})`,
                    }}
                  />
                </div>
                <div className="bar-value">₩{formatCurrency(sub.monthlyAmount)}</div>
              </div>
            ))}
            {topExpenses.length === 0 && (
              <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-lg)', fontSize: 13 }}>
                데이터가 없습니다
              </p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-lg)' }}>카테고리별 분석</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {Object.entries(activeSubsByCategory)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([cat, data]) => (
                <div key={cat} style={{
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span>{CATEGORY_ICONS[cat]}</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{CATEGORY_LABELS[cat] || cat}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>({data.count}개)</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                      ₩{formatCurrency(data.total)}/월
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${summary.monthly_total > 0 ? (data.total / summary.monthly_total) * 100 : 0}%`,
                        background: `var(--cat-${cat})`,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, textAlign: 'right' }}>
                    {summary.monthly_total > 0 ? Math.round((data.total / summary.monthly_total) * 100) : 0}% 비중
                  </div>
                </div>
              ))}
            {Object.keys(activeSubsByCategory).length === 0 && (
              <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                <p style={{ fontSize: 13 }}>활성 구독이 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insight: potential savings */}
      {activeSubs.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-xl)', background: 'var(--gradient-card)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: 'var(--space-md)' }}>💡 절약 인사이트</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', fontSize: 14, color: 'var(--text-secondary)' }}>
            {summary.monthly_total > 100000 && (
              <p>• 월 ₩{formatCurrency(summary.monthly_total)}를 구독에 사용하고 있습니다. 사용하지 않는 서비스가 있는지 확인해보세요.</p>
            )}
            {Object.entries(activeSubsByCategory).filter(([, d]) => d.count > 2).map(([cat, d]) => (
              <p key={cat}>
                • {CATEGORY_ICONS[cat]} <strong>{CATEGORY_LABELS[cat]}</strong> 카테고리에 {d.count}개의 구독이 있습니다. 통합할 수 있는지 검토해보세요.
              </p>
            ))}
            {activeSubs.some(s => s.billing_cycle === 'monthly' && s.amount > 30000) && (
              <p>• 일부 고액 구독은 연간 결제로 전환하면 할인을 받을 수 있습니다.</p>
            )}
            {activeSubs.length > 0 && Object.entries(activeSubsByCategory).filter(([, d]) => d.count > 2).length === 0 && summary.monthly_total <= 100000 && (
              <p>• 현재 구독이 잘 관리되고 있습니다! 👍</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
