import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe crear un usuario', async () => {
      const dto = { username: 'testuser', email: 'test@test.com', password: '123', rol: 'ADMIN' };
      const resultado = { id: 1, nombre: 'testuser', email: 'test@test.com', rol: 'ADMIN' };
      mockUsersService.create.mockResolvedValue(resultado);

      expect(await controller.create(dto)).toEqual(resultado);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('debe retornar un arreglo de usuarios', async () => {
      const resultado = [{ id: 1, nombre: 'testuser', email: 'test@test.com' }];
      mockUsersService.findAll.mockResolvedValue(resultado);

      expect(await controller.findAll()).toEqual(resultado);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('debe retornar un usuario por ID numérico', async () => {
      const id = 1; 
      const resultado = { id: 1, nombre: 'testuser', email: 'test@test.com' };
      mockUsersService.findOne.mockResolvedValue(resultado);

      expect(await controller.findOne(id)).toEqual(resultado);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('debe actualizar un usuario', async () => {
      const id = 1;
      const dto = { username: 'nuevoNombre' };
      const resultado = { id: 1, nombre: 'nuevoNombre', email: 'test@test.com' };
      mockUsersService.update.mockResolvedValue(resultado);

      expect(await controller.update(id, dto)).toEqual(resultado);
      expect(service.update).toHaveBeenCalledWith(id, dto);
    });
  });

  describe('remove', () => {
    it('debe eliminar un usuario y retornar el registro borrado', async () => {
      const idStr = '1';
      const resultado = { id: 1, nombre: 'testuser' };
      mockUsersService.remove.mockResolvedValue(resultado);

      expect(await controller.remove(idStr)).toEqual(resultado);
      expect(service.remove).toHaveBeenCalledWith(1); 
    });
  });
});