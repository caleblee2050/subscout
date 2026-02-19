import { NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/db';

export async function GET(request) {
    try {
        await initializeDatabase();
        const db = getDb();

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';

        let results;
        if (query) {
            results = await db.execute({
                sql: "SELECT * FROM service_catalog WHERE LOWER(name) LIKE ? OR LOWER(name_ko) LIKE ? ORDER BY name LIMIT 20",
                args: [`%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`],
            });
        } else {
            results = await db.execute('SELECT * FROM service_catalog ORDER BY name');
        }

        return NextResponse.json({ services: results.rows });
    } catch (error) {
        console.error('Catalog search error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
