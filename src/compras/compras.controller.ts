import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Res,
  Req,
  ParseIntPipe,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ComprasService } from './compras.service';
import { CreateCompraDto } from './dto/create-compra.dto';
import { UpdateCompraDto } from './dto/update-compra.dto';
import { PdfService } from '../pdf/pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('compras')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComprasController {
  constructor(
    private readonly comprasService: ComprasService,
    private readonly pdfService: PdfService,
  ) {}

  @Post()
  @Roles('ADMIN', 'BODEGUERO')
  create(@Body() createCompraDto: CreateCompraDto) {
    return this.comprasService.create(createCompraDto);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO')
  findAll() {
    return this.comprasService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO')
  findOne(@Param('id') id: string) {
    return this.comprasService.findOne(+id);
  }

  @Get(':id/pdf')
  @Roles('ADMIN', 'BODEGUERO')
  async descargarOrdenCompraPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const orden = await this.comprasService.findOne(id);

    if (!orden) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    const pdfBuffer = await this.pdfService.generarOrdenCompraPdf(orden);
    const codigoProyecto = orden['proyecto']?.codigoProyecto || 'PROY-GENERIC';
    const filename = `${codigoProyecto}_mp.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  @Patch(':id')
  @Roles('ADMIN', 'BODEGUERO')
  update(@Param('id') id: string, @Body() updateCompraDto: UpdateCompraDto) {
    return this.comprasService.update(+id, updateCompraDto);
  }

  @Patch(':id/recibir')
  @Roles('ADMIN', 'BODEGUERO')
  async recibir(@Param('id') id: string, @Req() req: any) {
    const usuarioId = req.user.id;
    return await this.comprasService.recibirOrden(+id, usuarioId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.comprasService.remove(+id);
  }
}
