import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { PrevisionService, UsuarioPrevision } from './prevision.service';
import { PrediccionQueryDto } from './dto/prediccion-query.dto';
import { GenerarAlertasDto } from './dto/generar-alertas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

/** Rutas bajo `/dashboard` para no tocar el DashboardController existente. */
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrevisionController {
  constructor(private readonly previsionService: PrevisionService) {}

  @Get('prediccion')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR')
  obtenerPrediccion(@Query() query: PrediccionQueryDto, @Req() req: { user: JwtPayload }) {
    return this.previsionService.obtenerPrediccion(query, this.usuario(req));
  }

  @Post('prediccion/alertas')
  @Roles('ADMIN')
  generarAlertas(@Body() body: GenerarAlertasDto, @Req() req: { user: JwtPayload }) {
    const query = new PrediccionQueryDto();
    if (body?.bodegaId !== undefined) query.bodegaId = body.bodegaId;
    return this.previsionService.generarAlertas(query, this.usuario(req));
  }

  private usuario(req: { user: JwtPayload }): UsuarioPrevision {
    return { id: req.user.id, rol: req.user.rol, bodegaIds: req.user.bodegaIds };
  }
}
