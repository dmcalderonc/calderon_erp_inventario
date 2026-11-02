import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { MovimientosService } from './movimientos.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PdfService } from '../pdf/pdf.service';
import { JwtPayload } from '../auth/jwt.strategy';
import { bodegasVisiblesPorUsuario } from '../common/utils/bodega-scope';

@Controller('movimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimientosController {
  constructor(
    private readonly movimientosService: MovimientosService,
    private readonly pdfService: PdfService,
  ) {}

  @Post()
  @Roles('ADMIN', 'BODEGUERO')
  async registrar(@Body() dto: CreateMovimientoDto, @Req() req: { user: JwtPayload }) {
    return await this.movimientosService.registrarMovimiento(dto, req.user.id);
  }

  @Get()
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  async findAll(@Req() req: { user: JwtPayload }) {
    const visibles = bodegasVisiblesPorUsuario(req.user.rol, req.user.bodegaIds);
    return await this.movimientosService.findAll(visibles);
  }

  @Get(':id')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  async findOne(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    const visibles = bodegasVisiblesPorUsuario(req.user.rol, req.user.bodegaIds);
    return await this.movimientosService.findOne(id, visibles);
  }

  @Get(':id/ticket')
  @Roles('ADMIN', 'BODEGUERO', 'COMPRADOR', 'SOLICITANTE')
  async descargarTicketPdf(@Param('id') id: string, @Res() res: Response, @Req() req: { user: JwtPayload }) {
    const visibles = bodegasVisiblesPorUsuario(req.user.rol, req.user.bodegaIds);
    const movimiento: any = await this.movimientosService.findOne(id as any, visibles);

    if (!movimiento) {
      throw new NotFoundException('Movimiento no encontrado');
    }

    const pdfBuffer =
      await this.pdfService.generarTicketMovimientoPdf(movimiento);

    const filename = `TICKET-MOV-${String(movimiento.id).split('-')[0]}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    res.end(pdfBuffer);
  }
}
