import { Test, TestingModule } from '@nestjs/testing';
import { ProveedoresService } from './proveedores.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Proveedor } from './proveedore.entity';

describe('ProveedoresService', () => {
  let service: ProveedoresService;
  const mockRepo = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedoresService, 
        { provide: getRepositoryToken(Proveedor), useValue: mockRepo }
      ],
    }).compile();
    service = module.get<ProveedoresService>(ProveedoresService);
  });

  it('debe crear proveedor exitosamente', async () => {
    mockRepo.save.mockResolvedValue({ id: 1, ruc: '1712345678001' });
    const result = await service.create({ ruc: '1712345678001' } as any);
    expect(result.id).toBe(1);
  });
});