import { db } from "../../lib/db.server";

export async function getCategories() {
	const result = await db.query(`
    SELECT id, name, description, sort_order, is_active
    FROM categories
    ORDER BY sort_order ASC
  `);

	return result.rows;
}

export async function getProducts() {
	const result = await db.query(`
    SELECT
      p.id,
      p.name,
      p.description,
      p.price,
      p.image_url,
      p.tax_rate,
      p.warehouse,
      p.is_active,
      p.sort_order,
      p.category_id,
      c.name AS category_name
    FROM products p
    JOIN categories c ON c.id = p.category_id
    ORDER BY p.sort_order ASC
  `);

	return result.rows;
}

export async function createCategory(data: {
	id: string;
	name: string;
	description: string;
	sort_order: number;
	is_active: boolean;
}) {
	await db.query(
		`
    INSERT INTO categories (
      id,
      name,
      description,
      sort_order,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5)
    `,
		[data.id, data.name, data.description, data.sort_order, data.is_active],
	);
}

export async function updateCategory(data: {
	id: string;
	name: string;
	description: string;
	sort_order: number;
	is_active: boolean;
}) {
	await db.query(
		`
    UPDATE categories
    SET
      name = $2,
      description = $3,
      sort_order = $4,
      is_active = $5,
      updated_at = NOW()
    WHERE id = $1
    `,
		[data.id, data.name, data.description, data.sort_order, data.is_active],
	);
}

export async function deleteCategoryIfEmpty(categoryId: string) {
	const countResult = await db.query(
		`
    SELECT COUNT(*)::int AS total
    FROM products
    WHERE category_id = $1
    `,
		[categoryId],
	);

	const total = countResult.rows[0]?.total ?? 0;

	if (total > 0) {
		throw new Error(
			"No puedes borrar esta categoría porque tiene productos asociados.",
		);
	}

	await db.query(
		`
    DELETE FROM categories
    WHERE id = $1
    `,
		[categoryId],
	);

	return { ok: true };
}

export async function createProduct(data: {
	name: string;
	description: string;
	price: number;
	category_id: string;
	image_url: string;
	tax_rate: number;
	warehouse: string;
	sort_order: number;
}) {
	await db.query(
		`
    INSERT INTO products (
      id,
      name,
      description,
      price,
      category_id,
      image_url,
      tax_rate,
      warehouse,
      sort_order,
      is_active
    )
    VALUES (
      gen_random_uuid(),
      $1, $2, $3, $4, $5, $6, $7, $8, true
    )
    `,
		[
			data.name,
			data.description,
			data.price,
			data.category_id,
			data.image_url,
			data.tax_rate,
			data.warehouse,
			data.sort_order,
		],
	);
}

export async function getProductById(productId: string) {
	const result = await db.query(
		`
    SELECT
      id,
      name,
      description,
      price,
      category_id,
      image_url,
      tax_rate,
      warehouse,
      sort_order,
      is_active
    FROM products
    WHERE id = $1
    `,
		[productId],
	);

	return result.rows[0] ?? null;
}

export async function updateProduct(data: {
	id: string;
	name: string;
	description: string;
	price: number;
	category_id: string;
	image_url: string;
	tax_rate: number;
	warehouse: string;
	sort_order: number;
	is_active: boolean;
}) {
	await db.query(
		`
    UPDATE products
    SET
      name = $2,
      description = $3,
      price = $4,
      category_id = $5,
      image_url = $6,
      tax_rate = $7,
      warehouse = $8,
      sort_order = $9,
      is_active = $10,
      updated_at = NOW()
    WHERE id = $1
    `,
		[
			data.id,
			data.name,
			data.description,
			data.price,
			data.category_id,
			data.image_url,
			data.tax_rate,
			data.warehouse,
			data.sort_order,
			data.is_active,
		],
	);
}

export async function deleteProduct(productId: string) {
	await db.query(
		`
    DELETE FROM products
    WHERE id = $1
    `,
		[productId],
	);

	return { ok: true };
}
