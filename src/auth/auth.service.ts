import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    if (!loginDto.email || !loginDto.password) {
      throw new UnauthorizedException('Email y contraseña son requeridos');
    }

    const user = await this.usersService.findByEmailForLogin(loginDto.email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    } catch (error) {
      isPasswordValid = false;
    }

    if (!isPasswordValid) {
      isPasswordValid = loginDto.password === user.password;
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const userAny = user as any;
    if (userAny.is_active !== undefined && !userAny.is_active) {
      throw new UnauthorizedException('El usuario está desactivado');
    }
    if (userAny.estado !== undefined && !userAny.estado) {
      throw new UnauthorizedException('El usuario está desactivado');
    }

    const payload = { 
      id: user.id, 
      sub: user.id, 
      email: user.email, 
      rol: user.rol, 
      bodega_id: userAny.bodega_id 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: { 
        id: user.id, 
        username: user.nombre, 
        rol: user.rol 
      }
    };
  }
}