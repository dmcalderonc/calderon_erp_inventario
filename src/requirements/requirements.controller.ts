import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ProyectoAccessGuard } from '../auth/guards/ProyectoAccessGuard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('requirements')
@UseGuards(JwtAuthGuard, RolesGuard, ProyectoAccessGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  create(@Body() createRequirementDto: CreateRequirementDto, @Req() req: any) {
    const userId = req.user.id;
    return this.requirementsService.create(createRequirementDto, userId);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  findAll(@Req() req: any) {
    const userId = req.user.id;
    const rol = req.user.rol;
    return this.requirementsService.findAll(userId, rol);
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const rol = req.user.rol;
    return this.requirementsService.findOne(+id, userId, rol);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR')
  updateStatus(
    @Param('id') id: string,
    @Body() updateRequirementDto: UpdateRequirementDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.requirementsService.updateStatus(
      +id,
      updateRequirementDto,
      userId,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.requirementsService.remove(+id);
  }
}
