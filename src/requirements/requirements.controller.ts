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
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  @Roles('ADMIN', 'BODEGUERO')
  create(@Body() createRequirementDto: CreateRequirementDto, @Req() req: any) {
    const userId = req.user.id;
    return this.requirementsService.create(createRequirementDto, userId);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO')
  findAll() {
    return this.requirementsService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO')
  findOne(@Param('id') id: string) {
    return this.requirementsService.findOne(+id);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'BODEGUERO')
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
