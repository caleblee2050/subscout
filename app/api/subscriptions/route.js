import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb, initializeDatabase } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        await initializeDatabase();
        const db = getDb();

        // Find or create user
        let userResult = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [session.user.email],
        });

        if (userResult.rows.length === 0) {
            const userId = uuidv4();
            await db.execute({
                sql: 'INSERT INTO users (id, email, name, avatar_url) VALUES (?, ?, ?, ?)',
                args: [userId, session.user.email, session.user.name, session.user.image],
            });
            return NextResponse.json({
                subscriptions: [],
                summary: { total: 0, active: 0, monthly_total: 0, yearly_total: 0 },
            });
        }

        const userId = userResult.rows[0].id;

        const result = await db.execute({
            sql: `SELECT s.*, sc.name as catalog_name, sc.name_ko, sc.logo_url as catalog_logo, sc.category as catalog_category
            FROM subscriptions s
            LEFT JOIN service_catalog sc ON s.service_id = sc.id
            WHERE s.user_id = ?
            ORDER BY s.status ASC, s.amount DESC`,
            args: [userId],
        });

        // Calculate summary
        const activeTotal = result.rows
            .filter(s => s.status === 'active')
            .reduce((sum, s) => {
                if (s.billing_cycle === 'yearly') return sum + Math.round(s.amount / 12);
                if (s.billing_cycle === 'weekly') return sum + s.amount * 4;
                return sum + s.amount;
            }, 0);

        return NextResponse.json({
            subscriptions: result.rows,
            summary: {
                total: result.rows.length,
                active: result.rows.filter(s => s.status === 'active').length,
                monthly_total: activeTotal,
                yearly_total: activeTotal * 12,
            },
        });
    } catch (error) {
        console.error('Get subscriptions error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        await initializeDatabase();
        const db = getDb();

        // Find or create user
        let userResult = await db.execute({
            sql: 'SELECT id FROM users WHERE email = ?',
            args: [session.user.email],
        });

        let userId;
        if (userResult.rows.length === 0) {
            userId = uuidv4();
            await db.execute({
                sql: 'INSERT INTO users (id, email, name, avatar_url) VALUES (?, ?, ?, ?)',
                args: [userId, session.user.email, session.user.name, session.user.image],
            });
        } else {
            userId = userResult.rows[0].id;
        }

        const body = await request.json();
        const id = uuidv4();

        // Try to match service catalog
        let serviceId = body.service_id || null;
        if (!serviceId && body.custom_name) {
            const match = await db.execute({
                sql: "SELECT id FROM service_catalog WHERE LOWER(name) LIKE ? OR LOWER(name_ko) LIKE ? LIMIT 1",
                args: [`%${body.custom_name.toLowerCase()}%`, `%${body.custom_name.toLowerCase()}%`],
            });
            if (match.rows.length > 0) serviceId = match.rows[0].id;
        }

        await db.execute({
            sql: `INSERT INTO subscriptions (id, user_id, service_id, custom_name, logo_url, amount, currency, billing_cycle, billing_day, next_billing_date, status, source, confidence, category, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id, userId, serviceId, body.custom_name || body.service_name,
                body.logo_url || null, body.amount || 0, body.currency || 'KRW',
                body.billing_cycle || 'monthly', body.billing_day || null,
                body.next_billing_date || null, body.status || 'active',
                body.source || 'manual', body.confidence || 1.0,
                body.category || 'other', body.notes || null,
            ],
        });

        return NextResponse.json({ id, message: '구독이 추가되었습니다.' });
    } catch (error) {
        console.error('Create subscription error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const db = getDb();
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
        }

        const updates = [];
        const args = [];

        if (body.custom_name !== undefined) { updates.push('custom_name = ?'); args.push(body.custom_name); }
        if (body.amount !== undefined) { updates.push('amount = ?'); args.push(body.amount); }
        if (body.billing_cycle !== undefined) { updates.push('billing_cycle = ?'); args.push(body.billing_cycle); }
        if (body.billing_day !== undefined) { updates.push('billing_day = ?'); args.push(body.billing_day); }
        if (body.status !== undefined) { updates.push('status = ?'); args.push(body.status); }
        if (body.category !== undefined) { updates.push('category = ?'); args.push(body.category); }
        if (body.notes !== undefined) { updates.push('notes = ?'); args.push(body.notes); }

        updates.push('updated_at = unixepoch()');
        args.push(body.id);

        await db.execute({
            sql: `UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ?`,
            args,
        });

        return NextResponse.json({ message: '구독이 수정되었습니다.' });
    } catch (error) {
        console.error('Update subscription error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
        }

        const db = getDb();
        await db.execute({
            sql: 'DELETE FROM subscriptions WHERE id = ?',
            args: [id],
        });

        return NextResponse.json({ message: '구독이 삭제되었습니다.' });
    } catch (error) {
        console.error('Delete subscription error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
