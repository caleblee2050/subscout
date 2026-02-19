import { createClient } from '@libsql/client';

let client;

export function getDb() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'file:local.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function initializeDatabase() {
  const db = getDb();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      avatar_url TEXT,
      google_access_token TEXT,
      google_refresh_token TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS service_catalog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_ko TEXT,
      logo_url TEXT,
      category TEXT,
      website_url TEXT,
      typical_price_krw INTEGER,
      billing_cycle TEXT,
      email_sender TEXT
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      service_id TEXT REFERENCES service_catalog(id),
      custom_name TEXT,
      logo_url TEXT,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'KRW',
      billing_cycle TEXT NOT NULL,
      billing_day INTEGER,
      next_billing_date TEXT,
      status TEXT DEFAULT 'active',
      source TEXT NOT NULL,
      confidence REAL DEFAULT 1.0,
      category TEXT,
      notes TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS email_scans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      gmail_message_id TEXT NOT NULL UNIQUE,
      subject TEXT,
      sender TEXT,
      received_date TEXT,
      scan_date INTEGER DEFAULT (unixepoch()),
      extracted_data TEXT,
      subscription_id TEXT REFERENCES subscriptions(id),
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS card_analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      file_name TEXT,
      upload_date INTEGER DEFAULT (unixepoch()),
      analysis_result TEXT,
      transactions_found INTEGER DEFAULT 0
    );
  `);

  // Seed service catalog with popular services
  const catalogCount = await db.execute('SELECT COUNT(*) as cnt FROM service_catalog');
  if (catalogCount.rows[0].cnt === 0) {
    await seedServiceCatalog(db);
  }

  return db;
}

async function seedServiceCatalog(db) {
  const services = [
    { id: 'netflix', name: 'Netflix', name_ko: '넷플릭스', category: 'streaming', typical_price_krw: 17000, billing_cycle: 'monthly', email_sender: 'info@account.netflix.com' },
    { id: 'youtube-premium', name: 'YouTube Premium', name_ko: '유튜브 프리미엄', category: 'streaming', typical_price_krw: 14900, billing_cycle: 'monthly', email_sender: 'noreply@youtube.com' },
    { id: 'spotify', name: 'Spotify', name_ko: '스포티파이', category: 'music', typical_price_krw: 10900, billing_cycle: 'monthly', email_sender: 'no-reply@spotify.com' },
    { id: 'apple-music', name: 'Apple Music', name_ko: '애플 뮤직', category: 'music', typical_price_krw: 10900, billing_cycle: 'monthly', email_sender: 'no_reply@email.apple.com' },
    { id: 'apple-one', name: 'Apple One', name_ko: '애플 원', category: 'bundle', typical_price_krw: 14900, billing_cycle: 'monthly', email_sender: 'no_reply@email.apple.com' },
    { id: 'disney-plus', name: 'Disney+', name_ko: '디즈니+', category: 'streaming', typical_price_krw: 13900, billing_cycle: 'monthly', email_sender: 'disneyplus@mail.disneyplus.com' },
    { id: 'coupang-play', name: 'Coupang Play', name_ko: '쿠팡 플레이', category: 'streaming', typical_price_krw: 7890, billing_cycle: 'monthly', email_sender: 'noreply@coupang.com' },
    { id: 'wavve', name: 'Wavve', name_ko: '웨이브', category: 'streaming', typical_price_krw: 13900, billing_cycle: 'monthly', email_sender: 'wavve@wavve.com' },
    { id: 'tving', name: 'TVING', name_ko: '티빙', category: 'streaming', typical_price_krw: 13900, billing_cycle: 'monthly', email_sender: 'tving@tving.com' },
    { id: 'chatgpt-plus', name: 'ChatGPT Plus', name_ko: 'ChatGPT 플러스', category: 'ai', typical_price_krw: 30000, billing_cycle: 'monthly', email_sender: 'noreply@tm.openai.com' },
    { id: 'claude-pro', name: 'Claude Pro', name_ko: 'Claude Pro', category: 'ai', typical_price_krw: 30000, billing_cycle: 'monthly', email_sender: 'noreply@anthropic.com' },
    { id: 'notion', name: 'Notion', name_ko: '노션', category: 'productivity', typical_price_krw: 12000, billing_cycle: 'monthly', email_sender: 'notify@notion.so' },
    { id: 'figma', name: 'Figma', name_ko: '피그마', category: 'design', typical_price_krw: 18000, billing_cycle: 'monthly', email_sender: 'noreply@figma.com' },
    { id: 'github-pro', name: 'GitHub Pro', name_ko: 'GitHub Pro', category: 'developer', typical_price_krw: 5500, billing_cycle: 'monthly', email_sender: 'noreply@github.com' },
    { id: 'slack', name: 'Slack', name_ko: '슬랙', category: 'productivity', typical_price_krw: 11000, billing_cycle: 'monthly', email_sender: 'feedback@slack.com' },
    { id: 'icloud-plus', name: 'iCloud+', name_ko: 'iCloud+', category: 'cloud', typical_price_krw: 1100, billing_cycle: 'monthly', email_sender: 'no_reply@email.apple.com' },
    { id: 'google-one', name: 'Google One', name_ko: '구글 원', category: 'cloud', typical_price_krw: 2400, billing_cycle: 'monthly', email_sender: 'googleone-noreply@google.com' },
    { id: 'microsoft-365', name: 'Microsoft 365', name_ko: '마이크로소프트 365', category: 'productivity', typical_price_krw: 8900, billing_cycle: 'monthly', email_sender: 'microsoft-noreply@microsoft.com' },
    { id: 'adobe-cc', name: 'Adobe Creative Cloud', name_ko: '어도비 CC', category: 'design', typical_price_krw: 79000, billing_cycle: 'monthly', email_sender: 'mail@mail.adobe.com' },
    { id: 'melon', name: 'Melon', name_ko: '멜론', category: 'music', typical_price_krw: 10900, billing_cycle: 'monthly', email_sender: 'melon@melon.com' },
    { id: 'genie', name: 'Genie Music', name_ko: '지니뮤직', category: 'music', typical_price_krw: 8900, billing_cycle: 'monthly', email_sender: 'genie@genie.co.kr' },
    { id: 'millie', name: "Millie's Library", name_ko: '밀리의 서재', category: 'reading', typical_price_krw: 9900, billing_cycle: 'monthly', email_sender: 'millie@millie.co.kr' },
    { id: 'ridi-select', name: 'RIDI Select', name_ko: '리디 셀렉트', category: 'reading', typical_price_krw: 9900, billing_cycle: 'monthly', email_sender: 'noreply@ridibooks.com' },
    { id: 'naver-plus', name: 'Naver Plus Membership', name_ko: '네이버 플러스 멤버십', category: 'membership', typical_price_krw: 4900, billing_cycle: 'monthly', email_sender: 'naverpay_noreply@navercorp.com' },
    { id: 'coupang-rocket', name: 'Coupang Rocket WOW', name_ko: '쿠팡 로켓와우', category: 'membership', typical_price_krw: 7890, billing_cycle: 'monthly', email_sender: 'noreply@coupang.com' },
  ];

  for (const s of services) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO service_catalog (id, name, name_ko, category, typical_price_krw, billing_cycle, email_sender) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [s.id, s.name, s.name_ko, s.category, s.typical_price_krw, s.billing_cycle, s.email_sender],
    });
  }
}
