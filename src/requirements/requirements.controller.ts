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
import { JwtPayload } from '../auth/jwt.strategy';

@Controller('requirements')
@UseGuards(JwtAuthGuard, RolesGuard, ProyectoAccessGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  create(@Body() createRequirementDto: CreateRequirementDto, @Req() req: { user: JwtPayload }) {
    return this.requirementsService.create(createRequirementDto, req.user.id);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  findAll(@Req() req: { user: JwtPayload }) {
    return this.requirementsService.findAll(req.user.id, req.user.rol);
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  findOne(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    return this.requirementsService.findOne(+id, req.user.id, req.user.rol);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() updateRequirementDto: UpdateRequirementDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.requirementsService.updateStatus(
      +id,
      updateRequirementDto,
      req.user.id,
      req.user.rol,
    );
  }

  @Patch(':id/evaluar-item/:detalleId')
  @Roles('ADMIN')
  evaluarItem(
    @Param('id') id: string,
    @Param('detalleId') detalleId: string,
    @Body('accion') accion: 'APROBADO' | 'RECHAZADO',
    @Req() req: { user: JwtPayload },
  ) {
    return this.requirementsService.evaluarItem(
      +id,
      +detalleId,
      accion,
      req.user.id,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.requirementsService.remove(+id);
  }
}
