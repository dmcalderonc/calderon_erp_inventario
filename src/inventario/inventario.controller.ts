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
  Req,
} from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { UpdateInventarioDto } from './dto/update-inventario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { JwtPayload } from '../auth/jwt.strategy';
import { bodegasVisiblesPorUsuario } from '../common/utils/bodega-scope';

@Controller('inventario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Post()
  @Roles('ADMIN', 'BODEGUERO')
  create(
    @Body() createInventarioDto: CreateInventarioDto,
    @Req() req: { user: JwtPayload },
  ) {
    const visibles = bodegasVisiblesPorUsuario(req.user.rol, req.user.bodegaIds);
    return this.inventarioService.create(createInventarioDto, req.user.id, visibles);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO')
  findAll(@Req() req: { user: JwtPayload }) {
    const visibles = bodegasVisiblesPorUsuario(req.user.rol, req.user.bodegaIds);
    return this.inventarioService.findAll(visibles);
  }

  @Get('bodega/:bodegaId')
  @Roles(UserRole.ADMIN, UserRole.BODEGUERO)
  async getByBodega(
    @Param('bodegaId', ParseIntPipe) bodegaId: number,
    @Req() req: { user: JwtPayload },
  ) {
    const visibles = bodegasVisiblesPorUsuario(req.user.rol, req.user.bodegaIds);
    return this.inventarioService.getStockByBodega(bodegaId, visibles);
  }

  @Get('material/:materialId/stock-por-bodega')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  async getStockByMaterial(
    @Param('materialId', ParseIntPipe) materialId: number,
    @Req() req: { user: JwtPayload },
  ) {
    const visibles = bodegasVisiblesPorUsuario(req.user.rol, req.user.bodegaIds);
    return this.inventarioService.getStockByBodegas(materialId, visibles);
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO')
  findOne(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    const visibles = bodegasVisiblesPorUsuario(req.user.rol, req.user.bodegaIds);
    return this.inventarioService.findOne(+id, visibles);
  }

  @Patch(':id')
  @Roles('ADMIN', 'BODEGUERO')
  update(
    @Param('id') id: string,
    @Body() updateInventarioDto: UpdateInventarioDto,
    @Req() req: { user: JwtPayload },
  ) {
    const visibles = bodegasVisiblesPorUsuario(req.user.rol, req.user.bodegaIds);
    return this.inventarioService.update(+id, updateInventarioDto, visibles);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.inventarioService.remove(+id);
  }
}
