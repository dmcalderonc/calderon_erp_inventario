import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

export interface JwtPayload {
  id: string;
  email: string;
  rol: string;
  bodegaIds: number[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super_secreto_para_erp_inventario_2026',
    });
  }

  async validate(payload: any): Promise<JwtPayload> {
    return {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
      bodegaIds: payload.bodegaIds || [],
    };
  }
}
