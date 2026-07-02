import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('movimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimientosController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Post()
  @Roles('ADMIN', 'BODEGUERO') 
  async registrar(@Body() dto: CreateMovimientoDto, @Req() req: any) {
    const usuarioId = req.user.id; 
    return await this.movimientosService.registrarMovimiento(dto, usuarioId);
  }
}