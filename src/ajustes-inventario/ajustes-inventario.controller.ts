import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { AjustesInventarioService } from './ajustes-inventario.service';
import { CreateAjusteInventarioDto } from './dto/create-ajustes-inventario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('ajustes-inventario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AjustesInventarioController {
  constructor(
    private readonly ajustesInventarioService: AjustesInventarioService,
 ) {}

  @Get()
  @Roles('ADMIN', 'BODEGUERO')
  findAll() {
    return this.ajustesInventarioService.findAll();
  }

  @Post()
  @Roles('ADMIN', 'BODEGUERO')
  async ejecutarAjuste(
    @Body() createAjusteDto: CreateAjusteInventarioDto,
    @Req() req: any,
  ) {
    const usuarioId = req.user.id;

    return await this.ajustesInventarioService.ejecutarAjusteFisico(
      createAjusteDto,
      usuarioId,
    );
  }
}
