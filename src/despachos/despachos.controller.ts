import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { DespachosService } from './despachos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateEntregaDirectaDto } from './dto/create-entrega-directa_mp.dto';

@Controller('despachos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DespachosController {
  constructor(private readonly despachosService: DespachosService) {}

  @Post('entrega-directa')
  @Roles('ADMIN', 'BODEGUERO')
  async entregaDirecta(@Body() dto: CreateEntregaDirectaDto, @Req() req: any) {
    const usuarioFirmaId = req.user.id;
    return await this.despachosService.registrarEntregaDirecta(
      dto,
      usuarioFirmaId,
    );
  }
}
