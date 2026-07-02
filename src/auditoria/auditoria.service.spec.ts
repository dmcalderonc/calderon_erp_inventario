import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaService } from './auditoria.service';
import { getModelToken } from '@nestjs/mongoose';
import { AuditoriaLog } from './auditoria.schema';

describe('AuditoriaService', () => {
  let service: AuditoriaService;


  const mockAuditoriaModel = {
    new: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        {

          provide: getModelToken(AuditoriaLog.name),
          useValue: mockAuditoriaModel,
        },
      ],
    }).compile();

    service = module.get<AuditoriaService>(AuditoriaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});