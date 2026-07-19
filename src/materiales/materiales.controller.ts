import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { MaterialesService } from './materiales.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('materiales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialesController {
  constructor(private readonly materialesService: MaterialesService) {}

  @Post()
  @Roles('ADMIN', 'BODEGUERO')
  async create(@Body() createMaterialDto: CreateMaterialDto, @Req() req: any) {
    const usuarioId = req.user.id;
    return this.materialesService.create(createMaterialDto, usuarioId);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  async findAll() {
    return this.materialesService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  async findOne(@Param('id') id: string) {
    return this.materialesService.findOne(+id);
  }

  @Put(':id')
  @Roles('ADMIN', 'BODEGUERO')
  async update(
    @Param('id') id: string,
    @Body() updateMaterialDto: UpdateMaterialDto,
    @Req() req: any,
  ) {
    const usuarioId = req.user.id;
    return this.materialesService.update(+id, updateMaterialDto, usuarioId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @Req() req: any) {
    const usuarioId = req.user.id;
    return this.materialesService.remove(+id, usuarioId);
  }
}
