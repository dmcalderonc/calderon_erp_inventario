// src/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('debe llamar al authService.login y retornar el token', async () => {
    const loginDto = { email: 'test@test.com', password: 'password123' };

    const serviceResult = { access_token: 'token_falso', user: { id: '1', username: 'Test', rol: 'ADMIN' } };
    
    const expectedControllerResult = {
      data: serviceResult,
      message: "Inicio de sesión exitoso"
    };

    mockAuthService.login.mockResolvedValue(serviceResult);

    const result = await controller.login(loginDto); 

    expect(authService.login).toHaveBeenCalledWith(loginDto);
    

    expect(result).toEqual(expectedControllerResult);
  });
});