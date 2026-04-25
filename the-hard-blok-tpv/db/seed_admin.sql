-- Usuario admin de emergencia (contraseña, no Google)
-- Opcional. Aplicar después de db/schema.sql y npm run db:auth-migrate si aplica.
--   npm run db:seed
--
-- Credenciales por defecto:
--   email: admin@thehardblok.local
--   password: Admin1234!
-- Cambiar la contraseña tras el primer acceso.

INSERT INTO users (name, email, password_hash, role, is_active)
VALUES (
  'Admin The Hard Blok',
  'admin@thehardblok.local',
  'scrypt:16384:8:1:H11ZD7brXzfxOmjHU6UnZw:0c7zZ67HdRQXlg0N9KPec0mBK1rHha0TvdkT34uwoLGQ5GI5__KyBfC2JouNq8rEKpd1847mKeGuk0TsuJuh4Q',
  'owner',
  TRUE
)
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
