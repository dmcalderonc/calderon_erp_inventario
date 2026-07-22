import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole, User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.usersService.create({
      username: registerDto.username,
      email: registerDto.email,
      password: hashedPassword,
      rol: UserRole.SOLICITANTE,
    });

    return this.generateLoginResponse(user);
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

    if (user.estado === false) {
      throw new UnauthorizedException('El usuario está desactivado');
    }

    return this.generateLoginResponse(user);
  }

  async loginWithUser(user: User) {
    if (user.estado === false) {
      throw new UnauthorizedException('El usuario está desactivado');
    }
    return this.generateLoginResponse(user);
  }

  private generateLoginResponse(user: User) {
    const payload = {
      id: user.id,
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      fotoPerfil: user.fotoPerfil || user.avatarUrl || null,
      googleId: user.googleId || null,
      avatarUrl: user.avatarUrl || null,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.nombre,
        rol: user.rol,
        email: user.email,
        fotoPerfil: user.fotoPerfil || user.avatarUrl || null,
        googleId: user.googleId || null,
        avatarUrl: user.avatarUrl || null,
      },
    };
  }
}