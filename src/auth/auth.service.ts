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
      username: registerDto.username,
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


    console.log('--- [DEBUG 1] USUARIO ENCONTRADO EN BD ---', user);

    if (!user || !user.password) {
      console.log('--- [DEBUG 2] ERROR: El usuario no existe o la contraseña viene vacía/nula ---');
      throw new UnauthorizedException('Credenciales incorrectas');
    }


    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
      console.log('--- [DEBUG 3] ¿La contraseña coincide en bcrypt?:', isPasswordValid);
    } catch (error) {
      console.log('--- [DEBUG 4] ERROR al comparar con bcrypt:', error.message);
      isPasswordValid = false;
    }

    if (!isPasswordValid) {
      isPasswordValid = loginDto.password === user.password;
      console.log('--- [DEBUG 5] ¿La contraseña coincide en texto plano?:', isPasswordValid);
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const userAny = user as any;
    if (userAny.is_active !== undefined && !userAny.is_active) {
      console.log('--- [DEBUG 6] ERROR: is_active está en false ---');
      throw new UnauthorizedException('El usuario está desactivado');
    }
    if (userAny.estado !== undefined && !userAny.estado) {
      console.log('--- [DEBUG 7] ERROR: estado está en false ---');
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