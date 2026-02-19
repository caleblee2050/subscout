import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, initializeDatabase } from '@/lib/db';
import { analyzeCardStatement } from '@/lib/ai-analyzer';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        await initializeDatabase();
        const db = getDb();

        const userResult = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [session.user.email],
        });
        if (userResult.rows.length === 0) {
            return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 });
        }
        const userId = userResult.rows[0].id;

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: '파일이 필요합니다' }, { status: 400 });
        }

        const text = await file.text();
        const fileName = file.name;

        const subscriptions = await analyzeCardStatement(text);

        const analysisId = uuidv4();
        await db.execute({
            sql: 'INSERT INTO card_analyses (id, user_id, file_name, analysis_result, transactions_found) VALUES (?, ?, ?, ?, ?)',
            args: [analysisId, userId, fileName, JSON.stringify(subscriptions), subscriptions.length],
        });

        const enriched = [];
        for (const sub of subscriptions) {
            const catalogMatch = await db.execute({
                sql: "SELECT * FROM service_catalog WHERE LOWER(name) LIKE ? OR LOWER(name_ko) LIKE ? LIMIT 1",
                args: [`%${sub.service_name?.toLowerCase()}%`, `%${sub.service_name?.toLowerCase()}%`],
            });

            const existingSub = await db.execute({
                sql: "SELECT id FROM subscriptions WHERE user_id = ? AND LOWER(custom_name) LIKE ?",
                args: [userId, `%${sub.service_name?.toLowerCase()}%`],
            });

            enriched.push({
                ...sub,
                catalog: catalogMatch.rows[0] || null,
                already_tracked: existingSub.rows.length > 0,
            });
        }

        return NextResponse.json({
            subscriptions: enriched,
            analysis_id: analysisId,
            message: `${subscriptions.length}개의 정기 구독 결제를 발견했습니다.`,
        });
    } catch (error) {
        console.error('Card analysis error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
