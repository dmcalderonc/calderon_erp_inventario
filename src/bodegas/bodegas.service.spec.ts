import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BodegasService } from './bodegas.service';
import { Bodega } from './bodegas.entity';

describe('BodegasService', () => {
  let service: BodegasService;

  const mockBodegaRepository = {
    create: jest.fn().mockImplementation(dto => dto),
    save: jest.fn().mockImplementation(dto => Promise.resolve({ id: 1, ...dto })),
    find: jest.fn().mockResolvedValue([{ id: 1, nombre: 'Principal' }]),
    findOneBy: jest.fn(),
    preload: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BodegasService,
        { provide: getRepositoryToken(Bodega), useValue: mockBodegaRepository },
      ],
    }).compile();

    service = module.get<BodegasService>(BodegasService);
    jest.clearAllMocks();
  });

  it('debe crear una bodega (con y sin manager)', async () => {
    const dto = { nombre: 'Norte', ubicacion: 'Norte' };
    expect(await service.create(dto)).toEqual({ id: 1, ...dto });
    expect(mockBodegaRepository.create).toHaveBeenCalledWith(dto);
  });

  it('debe buscar una bodega por id o lanzar NotFoundException', async () => {
    mockBodegaRepository.findOneBy.mockResolvedValueOnce({ id: 1, nombre: 'Principal' });
    expect(await service.findOne(1)).toEqual({ id: 1, nombre: 'Principal' });

    mockBodegaRepository.findOneBy.mockResolvedValueOnce(null);
    await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
  });

  it('debe actualizar una bodega', async () => {
    mockBodegaRepository.preload.mockResolvedValueOnce({ id: 1, nombre: 'Actualizada' });
    expect(await service.update(1, { nombre: 'Actualizada' } as any)).toEqual({ id: 1, nombre: 'Actualizada' });
  });

  it('debe eliminar una bodega', async () => {
    const mockBodega = { id: 1, nombre: 'Principal' };
    mockBodegaRepository.findOneBy.mockResolvedValueOnce(mockBodega);
    mockBodegaRepository.remove.mockResolvedValueOnce(mockBodega);
    
    expect(await service.remove(1)).toEqual(mockBodega);
    expect(mockBodegaRepository.remove).toHaveBeenCalledWith(mockBodega);
  });
});