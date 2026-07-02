import { Controller, Post, Body, UseGuards, Req, Get, Put, Param, Delete } from '@nestjs/common';
import { MaterialesService } from './materiales.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 

@Controller('materiales')
export class MaterialesController {
  constructor(private readonly materialesService: MaterialesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createMaterialDto: CreateMaterialDto, @Req() req: any) {
    const usuarioId = req.user.id; 
    return this.materialesService.create(createMaterialDto, usuarioId);
  }

  @Get()
  async findAll() {
    return this.materialesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.materialesService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateMaterialDto: UpdateMaterialDto,
    @Req() req: any
  ) {
    const usuarioId = req.user.id;
    return this.materialesService.update(+id, updateMaterialDto, usuarioId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const usuarioId = req.user.id;
    return this.materialesService.remove(+id, usuarioId);
  }
}