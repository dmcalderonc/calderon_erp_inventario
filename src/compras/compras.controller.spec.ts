import { Test, TestingModule } from '@nestjs/testing';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';
import { getModelToken } from '@nestjs/mongoose'; 
import { getRepositoryToken } from '@nestjs/typeorm'; 
import { OrdenCompra } from './entities/orden-compra.entity'; 
import { PdfService } from '../pdf/pdf.service'; 

describe('ComprasController', () => {
  let controller: ComprasController;


  const mockPdfService = {
    generarOrdenCompraPdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComprasController],
      providers: [
        {
          provide: ComprasService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            recibirOrden: jest.fn(),
            remove: jest.fn(),
          },
        },
        { provide: PdfService, useValue: mockPdfService }, 
      ],
    }).compile();
    controller = module.get<ComprasController>(ComprasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});