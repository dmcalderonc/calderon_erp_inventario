import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UnidadesMedidaService } from './unidades-medida.service';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('unidades-medida')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnidadesMedidaController {
  constructor(private readonly unidadesMedidaService: UnidadesMedidaService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createUnidadMedidaDto: CreateUnidadMedidaDto) {
    return this.unidadesMedidaService.create(createUnidadMedidaDto);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  findAll() {
    return this.unidadesMedidaService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  findOne(@Param('id') id: string) {
    return this.unidadesMedidaService.findOne(+id);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateUnidadMedidaDto: UpdateUnidadMedidaDto,
  ) {
    return this.unidadesMedidaService.update(+id, updateUnidadMedidaDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.unidadesMedidaService.remove(+id);
  }
}
