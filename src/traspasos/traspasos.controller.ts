import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { TraspasosService } from './traspasos.service';
import { CreateTraspasoDto } from './dto/create-traspaso.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

@Controller('traspasos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TraspasosController {
  constructor(private readonly traspasosService: TraspasosService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateTraspasoDto, @Req() req: { user: JwtPayload }) {
    return this.traspasosService.create(dto, req.user.id);
  }

  @Get()
  @Roles('ADMIN', 'COMPRADOR', 'SOLICITANTE')
  findAll(@Req() req: { user: JwtPayload }, @Query() query: { estado?: string; bodegaOrigenId?: number; bodegaDestinoId?: number }) {
    return this.traspasosService.findAll(query, req.user.id, req.user.rol, req.user.bodegaIds);
  }

  @Get(':id')
  @Roles('ADMIN', 'COMPRADOR', 'SOLICITANTE')
  findOne(@Param('id') id: string) {
    return this.traspasosService.findOne(+id);
  }

  @Patch(':id/enviar')
  @Roles('ADMIN', 'BODEGUERO')
  confirmarEnvio(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    return this.traspasosService.confirmarEnvio(+id, req.user.id, req.user.rol, req.user.bodegaIds);
  }

  @Patch(':id/recibir')
  @Roles('ADMIN', 'BODEGUERO')
  confirmarRecepcion(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    return this.traspasosService.confirmarRecepcion(+id, req.user.id, req.user.rol, req.user.bodegaIds);
  }

  @Patch(':id/autorizar')
  @Roles('ADMIN')
  autorizar(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    return this.traspasosService.autorizar(+id, req.user.id);
  }

  @Patch(':id/cancelar')
  @Roles('ADMIN')
  cancelar(@Param('id') id: string) {
    return this.traspasosService.cancelar(+id);
  }
}
