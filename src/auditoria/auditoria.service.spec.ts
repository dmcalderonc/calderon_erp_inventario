import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaLog } from './auditoria.schema';

describe('AuditoriaService', () => {
  let service: AuditoriaService;

  class MockAuditoriaModel {
    constructor(private data: any) {}
    save = jest.fn().mockResolvedValue(this.data);
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        {
          provide: getModelToken(AuditoriaLog.name),
          useValue: MockAuditoriaModel,
        },
      ],
    }).compile();

    service = module.get<AuditoriaService>(AuditoriaService);
  });

  it('debe registrar una accion en MongoDB sin fallar', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await service.registrarAccion('user-1', 'LOGIN', 'Auth', { ip: '127.0.0.1' });
    
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});