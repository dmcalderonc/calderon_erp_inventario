import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
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

  @Post()
  @Roles('ADMIN', 'COMPRADOR')
  create(@Body() createCotizacioneDto: CreateCotizacioneDto) {
    return this.cotizacionesService.create(createCotizacioneDto);
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
  update(
    @Param('id') id: string,
    @Body() updateCotizacioneDto: UpdateCotizacioneDto,
  ) {
    return this.cotizacionesService.update(+id, updateCotizacioneDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.cotizacionesService.remove(+id);
  }
}
