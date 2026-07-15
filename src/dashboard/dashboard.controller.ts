// src/dashboard/dashboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @Roles('ADMIN', 'BODEGUERO')
  getKpis() {
    return this.dashboardService.obtenerKpis();
  }

  @Get('alertas-stock')
  @Roles('ADMIN', 'BODEGUERO')
  getAlertasStock(@Query('umbral') umbral?: string) {

    const limite = umbral ? parseInt(umbral, 10) : 10;
    return this.dashboardService.obtenerAlertasStock(limite);
  }

  @Get('linea-tiempo')
  @Roles('ADMIN', 'BODEGUERO')
  getLineaTiempo() {
    return this.dashboardService.obtenerLineaTiempo();
  }
}