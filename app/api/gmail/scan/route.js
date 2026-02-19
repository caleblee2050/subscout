import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, initializeDatabase } from '@/lib/db';
import { scanForSubscriptionEmails, getEmailDetails } from '@/lib/gmail';
import { analyzeEmailsForSubscriptions } from '@/lib/ai-analyzer';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.accessToken) {
            return NextResponse.json({ error: '인증이 필요합니다. 다시 로그인해주세요.' }, { status: 401 });
        }

        // Parse request body for user settings
        let body = {};
        try { body = await request.json(); } catch (e) { /* no body */ }
        const userMaxResults = Math.min(Math.max(body.maxResults || 200, 50), 1000);
        const scanMonths = Math.min(Math.max(body.scanMonths || 6, 1), 24);

        await initializeDatabase();
        const db = getDb();

        // Ensure user exists
        const userId = session.user?.id || session.user?.email;
        const userResult = await db.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [session.user.email],
        });

        let user = userResult.rows[0];
        if (!user) {
            const newId = uuidv4();
            await db.execute({
                sql: 'INSERT INTO users (id, email, name, avatar_url, google_access_token) VALUES (?, ?, ?, ?, ?)',
                args: [newId, session.user.email, session.user.name, session.user.image, session.accessToken],
            });
            user = { id: newId, google_access_token: session.accessToken };
        } else {
            await db.execute({
                sql: 'UPDATE users SET google_access_token = ?, updated_at = unixepoch() WHERE id = ?',
                args: [session.accessToken, user.id],
            });
        }

        const accessToken = session.accessToken;

        // Scan Gmail for subscription emails
        const sinceDate = new Date();
        sinceDate.setMonth(sinceDate.getMonth() - scanMonths);
        const afterDate = sinceDate.toISOString().split('T')[0].replace(/-/g, '/');

        const messages = await scanForSubscriptionEmails(accessToken, {
            maxResults: userMaxResults,
            afterDate,
        });

        if (!messages || messages.length === 0) {
            return NextResponse.json({
                subscriptions: [],
                emails_found: 0,
                emails_scanned: 0,
                message: '이메일에서 구독 정보를 찾지 못했습니다.',
            });
        }

        // Get email details - NO artificial limit, process all found messages
        const emailDetails = [];
        const emailMap = new Map(); // messageId -> email detail for linking
        for (let i = 0; i < messages.length; i++) {
            try {
                const detail = await getEmailDetails(accessToken, messages[i].id);
                emailDetails.push(detail);
                emailMap.set(detail.id, detail);

                const existing = await db.execute({
                    sql: 'SELECT id FROM email_scans WHERE gmail_message_id = ? AND user_id = ?',
                    args: [messages[i].id, user.id],
                });
                if (existing.rows.length === 0) {
                    await db.execute({
                        sql: 'INSERT INTO email_scans (id, user_id, gmail_message_id, subject, sender, received_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        args: [uuidv4(), user.id, detail.id, detail.subject, detail.from, detail.date, 'pending'],
                    });
                }
            } catch (err) {
                console.error(`Failed to get email ${messages[i].id}:`, err.message);
            }
        }

        // Analyze with AI
        const discovered = await analyzeEmailsForSubscriptions(emailDetails);

        // Match with existing subscriptions and catalog, add email links
        const enriched = [];
        for (const sub of discovered) {
            const catalogMatch = await db.execute({
                sql: "SELECT * FROM service_catalog WHERE LOWER(name) LIKE ? OR LOWER(name_ko) LIKE ? LIMIT 1",
                args: [`%${sub.service_name?.toLowerCase()}%`, `%${sub.service_name?.toLowerCase()}%`],
            });

            const existingSub = await db.execute({
                sql: "SELECT * FROM subscriptions WHERE user_id = ? AND (LOWER(custom_name) LIKE ? OR service_id = ?)",
                args: [user.id, `%${sub.service_name?.toLowerCase()}%`, catalogMatch.rows[0]?.id || ''],
            });

            // Build Gmail web link for the source email
            const sourceEmail = sub.email_id ? emailMap.get(sub.email_id) : null;
            const gmailLink = sub.email_id
                ? `https://mail.google.com/mail/u/0/#inbox/${sub.email_id}`
                : null;

            enriched.push({
                ...sub,
                catalog: catalogMatch.rows[0] || null,
                already_tracked: existingSub.rows.length > 0,
                existing_id: existingSub.rows[0]?.id || null,
                gmail_link: gmailLink,
                source_subject: sourceEmail?.subject || null,
                source_date: sourceEmail?.date || null,
                source_from: sourceEmail?.from || null,
            });
        }

        return NextResponse.json({
            subscriptions: enriched,
            emails_found: messages.length,
            emails_scanned: emailDetails.length,
            scan_months: scanMonths,
            message: `${emailDetails.length}개의 이메일을 분석하여 ${enriched.length}개의 구독을 발견했습니다.`,
        });
    } catch (error) {
        console.error('Gmail scan error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
