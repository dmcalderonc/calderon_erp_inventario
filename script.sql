CREATE DATABASE db_erp_inventario;
\c db_erp_inventario
CREATE USER armin_erp_inventario WITH PASSWORD 'posts_pass_123';
ALTER ROLE armin_erp_inventario SET client_encoding TO 'utf8';
ALTER ROLE armin_erp_inventario SET default_transaction_isolation TO 'read committed';
ALTER ROLE armin_erp_inventario SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE db_erp_inventario TO armin_erp_inventario;
GRANT ALL ON SCHEMA public TO armin_erp_inventario;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO armin_erp_inventario;
ALTER DATABASE db_erp_inventario OWNER TO armin_erp_inventario;
ALTER SCHEMA public OWNER TO armin_erp_inventario;
GRANT CREATE ON SCHEMA public TO armin_erp_inventario;

mongosh

use admin

db.createUser({
    user: "erp_inventario_mongo",
    pwd: "erp_inventario_mongo_123",
    roles: [{ role: "root", db: "admin" }]
})

use erp_inventario_mongo