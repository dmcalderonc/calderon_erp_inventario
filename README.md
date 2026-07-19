Proyecto: proyecto_integrador_erp_inventario

Integrantes del Equipo

- Deyvi Rivera
- Diego Calderon
- Karla Mosquera

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

Para ejecutar las pruebas unitarias estándar:
npm test

Para ejecutar las pruebas y generar el reporte de cobertura:
npm run test:cov

Tecnologías Utilizadas

Framework: NestJS
ORM: TypeORM
Base de Datos Relacional: PostgreSQL
Base de Datos NoSQL: MongoDB (con Mongoose)
Seguridad: JWT (JSON Web Tokens)
Documentación: Swagger

## Sistema de Roles y Permisos

El sistema define 4 roles mediante el enum `UserRole`:

| Rol           | Acceso                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `ADMIN`       | Acceso completo a todos los módulos                                                                  |
| `BODEGUERO`   | Gestión de inventario, bodegas, materiales, despachos, movimientos y consulta de compras/proveedores |
| `COMPRADOR`   | Gestión de compras, cotizaciones, proveedores y consulta de requirements/solicitudes                 |
| `SOLICITANTE` | Creación y consulta de requirements, solicitudes de compra, materiales y proveedores                 |

Cada controlador usa `@UseGuards(JwtAuthGuard, RolesGuard)` a nivel de clase y `@Roles()` por método.

## Pruebas

El proyecto cuenta con **26 suites de prueba** (119 tests). Además de los módulos existentes, se crearon tests para:

- **Despachos** (`src/despachos/despachos.controller.spec.ts`, `despachos.service.spec.ts`)
- **Cotizaciones** (`src/cotizaciones/cotizaciones.controller.spec.ts`, `cotizaciones.service.spec.ts`)
- **Solicitudes de Compra** (`src/solicitudes-compra/solicitudes-compra.controller.spec.ts`, `solicitudes-compra.service.spec.ts`)

También se corrigieron tests preexistentes en los módulos de users, materiales, ajustes-inventario, dashboard, compras y requirements.

```bash
npm test          # Ejecutar todas las pruebas
npm run test:cov  # Pruebas con reporte de cobertura
```

## Correcciones Técnicas

- **despachos.service.ts**: Se corrigieron errores de TypeScript (relaciones TypeORM v0.3, uso de entidad en `manager.create`, se agregó estado `DESPACHADO` al enum `RequirementStatus`).
- **Guard sin usar**: `ProyectoAccessGuard` está definido en `src/auth/guards/` pero no se utiliza actualmente en ningún controlador.
- **cotizaciones.service.ts**: Contiene código placeholder (retorna strings). Pendiente de implementar con repositorios.
- **tsconfig.json**: Se agregó `"jest"` a la propiedad `types`.
