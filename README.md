 Proyecto: proyecto_integrador_erp_inventario 
 
 Integrantes del Equipo
 * Deyvi Rivera
 * Diego Calderon
 * Karla Mosquera
 
 
 Descripción Funcional
 Este sistema es una solución integral para la gestión de inventarios y procesos de 
 compras, diseñado para optimizar el control de existencias, la trazabilidad de 
 materiales y la relación con proveedores. El sistema centraliza la información 
 operativa en PostgreSQL para datos relacionales y utiliza MongoDB para el registro 
 de auditoría, garantizando un historial inalterable de los movimientos realizados 
 en las bodegas.
 
 
 Repositorio
 https://github.com/dmcalderonc/proyecto_integrador_erp_inventario.git



Instalación
Clonar el repositorio:
git clone https://github.com/dmcalderonc/proyecto_integrador_erp_inventario.git
cd proyecto_integrador_erp_inventario


Instalar dependencias:
npm install



Configuración de variables de entorno:
Crea un archivo .env en la raíz con la siguiente configuración:

PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=armin_erp_inventario
DB_PASSWORD=posts_pass_123
DB_DATABASE=db_erp_inventario
MONGO_URI=mongodb://localhost:27017/erp_inventario_mongo
JWT_SECRET=tu_secreto_aqui




Ejecución del proyecto:
npm run start:dev



Uso y Autenticación
El sistema utiliza JWT (JSON Web Token) para proteger las rutas críticas. Para acceder, 
primero debes autenticarte en /auth/login y utilizar el access_token recibido en los 
encabezados de tus peticiones bajo el esquema Bearer.



Tecnologías Utilizadas

Framework: NestJS
ORM: TypeORM
Base de Datos Relacional: PostgreSQL
Base de Datos NoSQL: MongoDB (con Mongoose)
Seguridad: JWT (JSON Web Tokens)
Documentación: Swagger




