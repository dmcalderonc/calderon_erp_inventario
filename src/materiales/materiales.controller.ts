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
  Query,
} from '@nestjs/common';
import { MaterialesService } from './materiales.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtPayload } from '../auth/jwt.strategy';

@Controller('materiales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialesController {
  constructor(private readonly materialesService: MaterialesService) {}

  @Post()
  @Roles('ADMIN', 'BODEGUERO')
  async create(@Body() createMaterialDto: CreateMaterialDto, @Req() req: { user: JwtPayload }) {
    return this.materialesService.create(createMaterialDto, req.user.id);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.materialesService.findAll(paginationDto);
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
    @Req() req: { user: JwtPayload },
  ) {
    return this.materialesService.update(+id, updateMaterialDto, req.user.id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    return this.materialesService.remove(+id, req.user.id);
  }
}
