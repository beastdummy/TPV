import { Pool } from "pg";

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
});

try {
	const context = await pool.query(
		"SELECT current_database() AS db, current_schema() AS schema",
	);
	const tables = await pool.query(
		`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'warehouses',
        'product_stock',
        'stock_movements',
        'suppliers',
        'purchase_receipts',
        'purchase_receipt_items'
      )
    ORDER BY table_name
  `,
	);

	console.log(JSON.stringify({ context: context.rows[0], tables: tables.rows }, null, 2));
} finally {
	await pool.end();
}
