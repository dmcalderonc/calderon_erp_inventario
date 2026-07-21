import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debe crear y guardar un usuario si el email no existe', async () => {
      const dto = {
        username: 'nuevo',
        email: 'nuevo@test.com',
        password: '123',
        rol: UserRole.SOLICITANTE,
      };
      const mappedUser = {
        nombre: 'nuevo',
        email: 'nuevo@test.com',
        password: '123',
        rol: UserRole.SOLICITANTE,
      };
      const savedUser = { id: 'uuid-123', ...mappedUser };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mappedUser);
      mockUserRepository.save.mockResolvedValue(savedUser);

      const resultado = await service.create(dto);

      expect(resultado).toEqual(savedUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith(mappedUser);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mappedUser);
    });

    it('debe lanzar BadRequestException si el email ya está registrado', async () => {
      const dto = {
        username: 'existente',
        email: 'existe@test.com',
        password: '123',
        rol: UserRole.SOLICITANTE,
      };
      mockUserRepository.findOne.mockResolvedValue({
        id: 'uuid-123',
        email: 'existe@test.com',
      });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(
        'El correo electrónico ya se encuentra registrado.',
      );
    });
  });

  describe('findByEmailForLogin', () => {
    it('debe retornar un usuario si se encuentra por email', async () => {
      const usuario = { id: 'uuid-123', email: 'login@test.com' };
      mockUserRepository.findOne.mockResolvedValue(usuario);

      const resultado = await service.findByEmailForLogin('login@test.com');

      expect(resultado).toEqual(usuario);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'login@test.com' },
        select: {
          id: true,
          nombre: true,
          email: true,
          password: true,
          rol: true,
          estado: true,
        },
      });
    });
  });

  describe('findAll', () => {
    it('debe retornar un arreglo de usuarios', async () => {
      const usuarios = [{ id: 'uuid-123', nombre: 'test' }];
      mockUserRepository.find.mockResolvedValue(usuarios);

      const resultado = await service.findAll();

      expect(resultado).toEqual(usuarios);
      expect(mockUserRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('debe retornar un usuario si existe', async () => {
      const usuario = { id: 'uuid-123', nombre: 'test' };
      mockUserRepository.findOne.mockResolvedValue(usuario);

      const resultado = await service.findOne('uuid-123');

      expect(resultado).toEqual(usuario);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('uuid-inexistente')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('uuid-inexistente')).rejects.toThrow(
        'Usuario con ID uuid-inexistente no encontrado',
      );
    });
  });

  describe('update', () => {
    it('debe actualizar un usuario si no se cambia el email', async () => {
      const id = 'uuid-123';
      const dto = { username: 'nombreActualizado' };
      const usuarioExistente = {
        id: 'uuid-123',
        nombre: 'viejo',
        email: 'test@test.com',
      };
      const usuarioActualizado = {
        ...usuarioExistente,
        nombre: 'nombreActualizado',
      };

      mockUserRepository.findOne.mockResolvedValue(usuarioExistente);
      mockUserRepository.merge.mockReturnValue(usuarioActualizado);
      mockUserRepository.save.mockResolvedValue(usuarioActualizado);

      const resultado = await service.update(id, dto);

      expect(resultado).toEqual(usuarioActualizado);
      expect(mockUserRepository.merge).toHaveBeenCalledWith(usuarioExistente, {
        nombre: 'nombreActualizado',
      });
    });

    it('debe actualizar un usuario y permitir cambio de email si no está en uso', async () => {
      const id = 'uuid-123';
      const dto = { email: 'nuevo@test.com' };
      const usuarioExistente = {
        id: 'uuid-123',
        nombre: 'user',
        email: 'viejo@test.com',
      };
      const usuarioActualizado = {
        ...usuarioExistente,
        email: 'nuevo@test.com',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(usuarioExistente)
        .mockResolvedValueOnce(null);

      mockUserRepository.merge.mockReturnValue(usuarioActualizado);
      mockUserRepository.save.mockResolvedValue(usuarioActualizado);

      const resultado = await service.update(id, dto);

      expect(resultado).toEqual(usuarioActualizado);
    });

    it('debe lanzar BadRequestException si se intenta cambiar a un email que ya está en uso', async () => {
      const id = 'uuid-123';
      const dto = { email: 'ocupado@test.com' };
      const usuarioExistente = {
        id: 'uuid-123',
        nombre: 'user',
        email: 'viejo@test.com',
      };

      mockUserRepository.findOne
        .mockResolvedValueOnce(usuarioExistente)
        .mockResolvedValueOnce({ id: 'uuid-456', email: 'ocupado@test.com' });

      await expect(service.update(id, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(id, dto)).rejects.toThrow(
        'El correo electrónico ya está en uso por otro usuario.',
      );
    });
  });

  describe('remove', () => {
    it('debe eliminar un usuario y retornar su id y nombre', async () => {
      const usuarioExistente = {
        id: 'uuid-123',
        nombre: 'usuarioBorrar',
        email: 'test@test.com',
      };

      mockUserRepository.findOne.mockResolvedValue(usuarioExistente);
      mockUserRepository.remove.mockResolvedValue(usuarioExistente);

      const resultado = await service.remove('uuid-123');

      expect(resultado).toEqual({ id: 'uuid-123', nombre: 'usuarioBorrar' });
      expect(mockUserRepository.remove).toHaveBeenCalledWith(usuarioExistente);
    });
  });
});
