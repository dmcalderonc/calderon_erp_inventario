import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProyectoUsuario } from '../../users/proyecto-usuario.entity';

@Injectable()
export class ProyectoAccessGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    if (user.rol === 'ADMIN') return true;

    const proyectoId = request.params.proyectoId || request.query.proyectoId;

    if (!proyectoId) return true;

    const repo = this.dataSource.getRepository(ProyectoUsuario);
    const acceso = await repo.findOne({
      where: { proyecto: { id: proyectoId }, usuario: { id: user.id } },
    });

    if (!acceso) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }
    return true;
  }
}
