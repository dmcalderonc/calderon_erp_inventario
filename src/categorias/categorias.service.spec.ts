import { Test, TestingModule } from '@nestjs/testing';
import { CategoriasService } from './categorias.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Categoria } from './categoria.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CategoriasService', () => {
  let service: CategoriasService;
  

  const mockCategoriaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOneBy: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasService,
        {
          provide: getRepositoryToken(Categoria),
          useValue: mockCategoriaRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriasService>(CategoriasService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear y guardar una categoría exitosamente', async () => {
      const dto = { nombre: 'Materiales', prefijo: 'MAT' };
      const categoriaGuardada = { id: 1, ...dto };

      mockCategoriaRepository.create.mockReturnValue(dto);
      mockCategoriaRepository.save.mockResolvedValue(categoriaGuardada);

      const resultado = await service.create(dto);

      expect(resultado).toEqual(categoriaGuardada);
      expect(mockCategoriaRepository.create).toHaveBeenCalledWith(dto);
      expect(mockCategoriaRepository.save).toHaveBeenCalledWith(dto);
    });

    it('debe lanzar BadRequestException si hay error 23505 (duplicado)', async () => {
      const dto = { nombre: 'Materiales', prefijo: 'MAT' };
      mockCategoriaRepository.create.mockReturnValue(dto);
      mockCategoriaRepository.save.mockRejectedValue({ code: '23505' });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow('El nombre o el prefijo ya se encuentra registrado.');
    });
  });

  describe('findAll', () => {
    it('debe retornar un arreglo de categorías', async () => {
      const categorias = [{ id: 1, nombre: 'Materiales', prefijo: 'MAT' }];
      mockCategoriaRepository.find.mockResolvedValue(categorias);

      const resultado = await service.findAll();

      expect(resultado).toEqual(categorias);
      expect(mockCategoriaRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('debe retornar una categoría si existe', async () => {
      const categoria = { id: 1, nombre: 'Materiales', prefijo: 'MAT' };
      mockCategoriaRepository.findOneBy.mockResolvedValue(categoria);

      const resultado = await service.findOne(1);

      expect(resultado).toEqual(categoria);
      expect(mockCategoriaRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('debe lanzar NotFoundException si la categoría no existe', async () => {
      mockCategoriaRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(99)).rejects.toThrow('La categoría con ID 99 no existe.');
    });
  });

  describe('update', () => {
    it('debe actualizar una categoría exitosamente', async () => {
      const id = 1;
      const dto = { nombre: 'Materiales Act' };
      const categoriaExistente = { id: 1, nombre: 'Materiales', prefijo: 'MAT' };
      const categoriaActualizada = { ...categoriaExistente, ...dto };

      mockCategoriaRepository.findOneBy.mockResolvedValue(categoriaExistente);
      mockCategoriaRepository.merge.mockReturnValue(categoriaActualizada);
      mockCategoriaRepository.save.mockResolvedValue(categoriaActualizada);

      const resultado = await service.update(id, dto);

      expect(resultado).toEqual(categoriaActualizada);
      expect(mockCategoriaRepository.merge).toHaveBeenCalledWith(categoriaExistente, dto);
      expect(mockCategoriaRepository.save).toHaveBeenCalledWith(categoriaActualizada);
    });

    it('debe lanzar BadRequestException en actualización si hay duplicado', async () => {
      const id = 1;
      const dto = { nombre: 'Materiales' };
      const categoriaExistente = { id: 1, nombre: 'Antiguo', prefijo: 'ANT' };

      mockCategoriaRepository.findOneBy.mockResolvedValue(categoriaExistente);
      mockCategoriaRepository.merge.mockReturnValue({ ...categoriaExistente, ...dto });
      mockCategoriaRepository.save.mockRejectedValue({ code: '23505' });

      await expect(service.update(id, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('debe eliminar una categoría y retornar mensaje de éxito', async () => {
      const categoriaExistente = { id: 1, nombre: 'Reactivos' };
      mockCategoriaRepository.findOneBy.mockResolvedValue(categoriaExistente);
      mockCategoriaRepository.remove.mockResolvedValue(categoriaExistente);

      const resultado = await service.remove(1);

      expect(resultado).toEqual({ message: 'La categoría "Reactivos" fue eliminada correctamente.' });
      expect(mockCategoriaRepository.remove).toHaveBeenCalledWith(categoriaExistente);
    });
  });
});