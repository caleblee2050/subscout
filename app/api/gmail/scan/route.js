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
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const afterDate = sixMonthsAgo.toISOString().split('T')[0].replace(/-/g, '/');

        const messages = await scanForSubscriptionEmails(accessToken, {
            maxResults: 100,
            afterDate,
        });

        if (!messages || messages.length === 0) {
            return NextResponse.json({ subscriptions: [], message: '이메일에서 구독 정보를 찾지 못했습니다.' });
        }

        // Get email details
        const emailDetails = [];
        for (let i = 0; i < Math.min(messages.length, 50); i++) {
            try {
                const detail = await getEmailDetails(accessToken, messages[i].id);
                emailDetails.push(detail);

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

        // Match with existing subscriptions and catalog
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

            enriched.push({
                ...sub,
                catalog: catalogMatch.rows[0] || null,
                already_tracked: existingSub.rows.length > 0,
                existing_id: existingSub.rows[0]?.id || null,
            });
        }

        return NextResponse.json({
            subscriptions: enriched,
            emails_scanned: emailDetails.length,
            message: `${emailDetails.length}개의 이메일을 분석하여 ${enriched.length}개의 구독을 발견했습니다.`,
        });
    } catch (error) {
        console.error('Gmail scan error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
