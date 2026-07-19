import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedoreDto } from './dto/update-proveedor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Proveedores')
@ApiBearerAuth()
@Controller('proveedores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Post()
  @Roles('ADMIN', 'COMPRADOR')
  @ApiOperation({ summary: 'Crear un nuevo proveedor' })
  @ApiResponse({ status: 201, description: 'Proveedor creado correctamente' })
  create(@Body() createProveedoreDto: CreateProveedorDto) {
    return this.proveedoresService.create(createProveedoreDto);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  @ApiOperation({ summary: 'Obtener todos los proveedores' })
  findAll() {
    return this.proveedoresService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  findOne(@Param('id') id: string) {
    return this.proveedoresService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'COMPRADOR')
  @ApiOperation({ summary: 'Actualizar un proveedor' })
  update(
    @Param('id') id: string,
    @Body() updateProveedoreDto: UpdateProveedoreDto,
  ) {
    return this.proveedoresService.update(+id, updateProveedoreDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Eliminar un proveedor' })
  remove(@Param('id') id: string) {
    return this.proveedoresService.remove(+id);
  }
}
