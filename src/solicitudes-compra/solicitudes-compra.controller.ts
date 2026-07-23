import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SolicitudesCompraService } from './solicitudes-compra.service';
import { CreateSolicitudesCompraDto } from './dto/create-solicitudes-compra.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProyectoAccessGuard } from '../auth/guards/ProyectoAccessGuard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EstadoSolicitud } from './entities/solicitud-compra.entity';
import { JwtPayload } from '../auth/jwt.strategy';

@Controller('solicitudes-compra')
@UseGuards(JwtAuthGuard, RolesGuard, ProyectoAccessGuard)
export class SolicitudesCompraController {
  constructor(private readonly solicitudesService: SolicitudesCompraService) {}

  @Post()
  @Roles('ADMIN', 'SOLICITANTE')
  create(@Body() createDto: CreateSolicitudesCompraDto) {
    return this.solicitudesService.create(createDto);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  findAll(
    @Query('estado') estado?: EstadoSolicitud,
    @Query('proyectoId') proyectoId?: string,
  ) {
    return this.solicitudesService.findAll(estado, proyectoId);
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  findOne(@Param('id') id: string) {
    return this.solicitudesService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  update(@Param('id') id: string, @Body() updateDto: any, @Req() req: { user: JwtPayload }) {
    return this.solicitudesService.update(
      +id,
      updateDto,
      req.user.id,
      req.user.rol,
    );
  }

  @Patch(':id/cotizar')
  @Roles('ADMIN', 'COMPRADOR')
  cotizar(@Param('id') id: string) {
    return this.solicitudesService.cotizar(+id);
  }

  @Patch(':id/aprobar')
  @Roles('ADMIN', 'COMPRADOR')
  aprobar(@Param('id') id: string) {
    return this.solicitudesService.aprobar(+id);
  }

  @Patch(':id/procesar')
  @Roles('ADMIN', 'COMPRADOR')
  procesar(@Param('id') id: string) {
    return this.solicitudesService.procesar(+id);
  }
}
