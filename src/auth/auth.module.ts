import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './google.strategy';
import { ProyectoAccessGuard } from './guards/ProyectoAccessGuard';
import { ProyectoUsuario } from '../users/proyecto-usuario.entity';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET || 'super_secreto_para_erp_inventario_2026',
      signOptions: { expiresIn: '1d' },
    }),
    TypeOrmModule.forFeature([ProyectoUsuario]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, ProyectoAccessGuard],
  exports: [AuthService, ProyectoAccessGuard],
})
export class AuthModule {}
