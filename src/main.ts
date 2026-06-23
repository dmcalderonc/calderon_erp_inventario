import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Mi doc')
    .setDescription('Descripción de mi doc')
    .setVersion('1.0')
    .addTag('usuarios')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Documentación API ERP',
  });
  

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  await app.listen(port);
  const server = app.getHttpServer();
  const router = server._events.request._router;
  const routes = router.stack.map(layer => layer.route?.path).filter(Boolean);
  console.log('Rutas registradas:', routes);

  console.log(`Aplicación corriendo en: http://localhost:${port}`);
  console.log(`Documentación de Swagger disponible en: http://localhost:${port}/doc`);
}
bootstrap();

