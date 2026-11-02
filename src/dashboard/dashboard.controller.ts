// src/dashboard/dashboard.controller.ts
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { bodegasVisiblesPorUsuario } from '../common/utils/bodega-scope';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  getKpis() {
    return this.dashboardService.obtenerKpis();
  }

  @Get('alertas-stock')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  getAlertasStock(@Query('umbral') umbral?: string, @Req() req?: { user: JwtPayload }) {
    const limite = umbral ? parseInt(umbral, 10) : 10;
    const visibles = req?.user
      ? bodegasVisiblesPorUsuario(req.user.rol, req.user.bodegaIds)
      : null;
    return this.dashboardService.obtenerAlertasStock(limite, visibles);
  }

  @Get('linea-tiempo')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  getLineaTiempo() {
    return this.dashboardService.obtenerLineaTiempo();
  }
}
