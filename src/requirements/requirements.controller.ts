import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  create(@Body() createRequirementDto: CreateRequirementDto, @Req() req: any) {
    const userId = req.user?.id || 'uuid-de-tu-usuario-prueba'; 
    return this.requirementsService.create(createRequirementDto, userId);
  }

  @Get()
  findAll() {
    return this.requirementsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requirementsService.findOne(+id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string, 
    @Body() updateRequirementDto: UpdateRequirementDto, 
    @Req() req: any
  ) {
    const userId = req.user?.id || 'uuid-de-tu-usuario-prueba';
    return this.requirementsService.updateStatus(+id, updateRequirementDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requirementsService.remove(+id);
  }
}