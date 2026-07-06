import { Test, TestingModule } from '@nestjs/testing';
import { MaterialesService } from './materiales.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Material } from './material.entity';
import { DataSource } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MaterialesService', () => {
  let service: MaterialesService;

  const mockManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: mockManager,
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockMaterialRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockAuditoriaService = {
    registrarAccion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialesService,
        { provide: getRepositoryToken(Material), useValue: mockMaterialRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: AuditoriaService, useValue: mockAuditoriaService },
      ],
    }).compile();

    service = module.get<MaterialesService>(MaterialesService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = { nombre: 'Tubo', descripcion: 'Vidrio', unidad_medida: 'Und', categoria_id: 1 };
    const usuarioId = 99;
    const categoriaMock = { id: 1, nombre: 'Vidriería', prefijo: 'VID' };

    it('debe crear un material con SKU inicial si no hay materiales previos', async () => {
      mockManager.findOne.mockResolvedValueOnce(categoriaMock);
      mockManager.findOne.mockResolvedValueOnce(null);
      
      const nuevoMaterial = { nombre: 'Tubo', sku: 'VID-0001' };
      mockManager.create.mockReturnValue(nuevoMaterial);
      mockManager.save.mockResolvedValue(nuevoMaterial);

      const resultado = await service.create(dto, usuarioId);

      expect(resultado.sku).toEqual('VID-0001');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockAuditoriaService.registrarAccion).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('debe crear un material incrementando el SKU del último registro', async () => {
      mockManager.findOne.mockResolvedValueOnce(categoriaMock);
      mockManager.findOne.mockResolvedValueOnce({ sku: 'VID-0015' }); 
      
      const nuevoMaterial = { nombre: 'Tubo', sku: 'VID-0016' };
      mockManager.create.mockReturnValue(nuevoMaterial);
      mockManager.save.mockResolvedValue(nuevoMaterial);

      const resultado = await service.create(dto, usuarioId);

      expect(resultado.sku).toEqual('VID-0016');
    });

    it('debe lanzar NotFoundException y hacer rollback si la categoría no existe', async () => {
      mockManager.findOne.mockResolvedValueOnce(null); 

      await expect(service.create(dto, usuarioId)).rejects.toThrow(NotFoundException);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('debe retornar un arreglo de materiales con sus categorías', async () => {
      const materiales = [{ id: 1, nombre: 'Tubo', categoria: { id: 1, nombre: 'Vidrio' } }];
      mockMaterialRepository.find.mockResolvedValue(materiales);

      const resultado = await service.findAll();
      expect(resultado).toEqual(materiales);
      expect(mockMaterialRepository.find).toHaveBeenCalledWith({ relations: { categoria: true } });
    });
  });

  describe('findOne', () => {
    it('debe retornar un material si existe', async () => {
      const material = { id: 1, nombre: 'Tubo' };
      mockMaterialRepository.findOne.mockResolvedValue(material);

      expect(await service.findOne(1)).toEqual(material);
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      mockMaterialRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const usuarioId = 99;

    it('debe actualizar un material correctamente y registrar auditoría', async () => {
      const materialExistente = { id: 1, nombre: 'Tubo', sku: 'VID-0001' };
      const dto = { nombre: 'Tubo de 10ml' };
      const materialActualizado = { ...materialExistente, ...dto };

      mockMaterialRepository.findOne.mockResolvedValue(materialExistente);
      mockMaterialRepository.merge.mockReturnValue(materialActualizado);
      mockMaterialRepository.save.mockResolvedValue(materialActualizado);

      const resultado = await service.update(1, dto, usuarioId);

      expect(resultado).toEqual(materialActualizado);
      expect(mockAuditoriaService.registrarAccion).toHaveBeenCalledWith(
        '99', 'ACTUALIZAR_MATERIAL', 'Materiales', expect.any(Object)
      );
    });

    it('debe lanzar BadRequestException si se intenta alterar el SKU', async () => {
      const materialExistente = { id: 1, sku: 'VID-0001' };
      const dto = { sku: 'VID-9999' }; // Intento de hackear el SKU

      mockMaterialRepository.findOne.mockResolvedValue(materialExistente);

      await expect(service.update(1, dto, usuarioId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('debe eliminar un material, auditar la acción y retornar un mensaje', async () => {
      const material = { id: 1, nombre: 'Tubo', sku: 'VID-0001' };
      const usuarioId = 99;

      mockMaterialRepository.findOne.mockResolvedValue(material);
      mockMaterialRepository.remove.mockResolvedValue(material);

      const resultado = await service.remove(1, usuarioId);

      expect(resultado).toEqual({ message: 'El material con SKU VID-0001 ha sido eliminado.' });
      expect(mockMaterialRepository.remove).toHaveBeenCalledWith(material);
      expect(mockAuditoriaService.registrarAccion).toHaveBeenCalledWith(
        '99', 'ELIMINAR_MATERIAL', 'Materiales', expect.any(Object)
      );
    });
  });
});