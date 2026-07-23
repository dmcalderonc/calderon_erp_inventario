import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.create({
      nombre: registerDto.nombre,
      email: registerDto.email,
      password: hashedPassword,
      rol: UserRole.SOLICITANTE,
    });

    return {
      message: 'Usuario registrado exitosamente',
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    };
  }

  async login(loginDto: LoginDto) {
    if (!loginDto.email || !loginDto.password) {
      throw new UnauthorizedException('Email y contraseña son requeridos');
    }

    const user = await this.usersService.findByEmailForLogin(loginDto.email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (user.estado !== undefined && !user.estado) {
      throw new UnauthorizedException('El usuario está desactivado');
    }

    return {
      access_token: this.generateToken(user),
      user: { 
        id: user.id, 
        nombre: user.nombre, 
        rol: user.rol 
      }
    };
  }

  generateToken(user: { id: string; email?: string | null; rol: UserRole | string; bodegaAsignadaId?: number | null }): string {
    const payload = {
      id: user.id,
      sub: user.id,
      email: user.email,
      rol: user.rol,
      bodegaAsignadaId: user.bodegaAsignadaId ?? null,
    };
    return this.jwtService.sign(payload);
  }
}
