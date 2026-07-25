import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CotizacionesService } from './cotizaciones.service';
import { CreateCotizacioneDto } from './dto/create-cotizacione.dto';
import { UpdateCotizacioneDto } from './dto/update-cotizacione.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('cotizaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CotizacionesController {
  constructor(private readonly cotizacionesService: CotizacionesService) {}

  @Get('en-compras')
  @Roles('ADMIN', 'COMPRADOR')
  getRequerimientosEnCompras() {
    return this.cotizacionesService.getRequerimientosEnCompras();
  }

  @Get('by-requirement/:requirementId')
  @Roles('ADMIN', 'COMPRADOR')
  getCotizacionesByRequirement(@Param('requirementId', ParseIntPipe) requirementId: number) {
    return this.cotizacionesService.getCotizacionesByRequirement(requirementId);
  }

  @Post('generar-oc/:requirementId')
  @Roles('ADMIN', 'COMPRADOR')
  generarOC(@Param('requirementId', ParseIntPipe) requirementId: number) {
    return this.cotizacionesService.generarOC(requirementId);
  }

  @Post()
  @Roles('ADMIN', 'COMPRADOR')
  create(@Body() dto: CreateCotizacioneDto) {
    return this.cotizacionesService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  findAll() {
    return this.cotizacionesService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  findOne(@Param('id') id: string) {
    return this.cotizacionesService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'COMPRADOR')
  update(@Param('id') id: string, @Body() dto: UpdateCotizacioneDto) {
    return this.cotizacionesService.update(+id, dto);
  }

  @Patch(':id/seleccionar')
  @Roles('ADMIN', 'COMPRADOR')
  seleccionar(@Param('id') id: string) {
    return this.cotizacionesService.seleccionar(+id);
  }

  @Patch(':id/descartar')
  @Roles('ADMIN', 'COMPRADOR')
  descartar(@Param('id') id: string) {
    return this.cotizacionesService.descartar(+id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.cotizacionesService.remove(+id);
  }
}
