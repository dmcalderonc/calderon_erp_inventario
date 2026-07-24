import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BodegasService } from './bodegas.service';
import { CreateBodegaDto } from './dto/create-bodegas.dto';
import { UpdateBodegasDto } from './dto/update-bodegas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('bodegas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BodegasController {
  constructor(private readonly bodegasService: BodegasService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createBodegaDto: CreateBodegaDto) {
    return this.bodegasService.create(createBodegaDto);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO')
  findAll(@Query('includeSuspended') includeSuspended?: string) {
    return this.bodegasService.findAll(includeSuspended === 'true');
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bodegasService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBodegasDto: UpdateBodegasDto,
  ) {
    return this.bodegasService.update(id, updateBodegasDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bodegasService.remove(id);
  }
}
