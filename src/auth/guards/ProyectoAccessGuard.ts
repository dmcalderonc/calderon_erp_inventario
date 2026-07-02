import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm'; 
import { ProyectoUsuario } from '../../users/proyecto-usuario.entity';

@Injectable()
export class ProyectoAccessGuard implements CanActivate {
  constructor(private repo: Repository<ProyectoUsuario>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const { proyectoId } = request.params;

    const acceso = await this.repo.findOne({ 
      where: { proyecto: { id: proyectoId }, usuario: { id: user.id } } 
    });

    if (!acceso) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }
    return true;
  }
}