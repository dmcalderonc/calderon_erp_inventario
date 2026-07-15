import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmailForLogin: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mocked_token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    
    jest.clearAllMocks();
  });

  it('debe lanzar UnauthorizedException si no se envia email o password', async () => {
    await expect(service.login({ email: '' })).rejects.toThrow(UnauthorizedException);
  });

  it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
    mockUsersService.findByEmailForLogin.mockResolvedValueOnce(null);
    await expect(service.login({ email: 'test@test.com', password: '123' })).rejects.toThrow(UnauthorizedException);
  });

  it('debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
    mockUsersService.findByEmailForLogin.mockResolvedValueOnce({ password: 'hashedpassword' });
    

    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    
    await expect(service.login({ email: 'test@test.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
  });

  it('debe retornar access_token y usuario si las credenciales son correctas', async () => {
    const mockUser = { id: '1', email: 'test@test.com', password: 'hashedpassword', nombre: 'Test', rol: 'ADMIN', is_active: true };
    mockUsersService.findByEmailForLogin.mockResolvedValueOnce(mockUser);
    

    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const result = await service.login({ email: 'test@test.com', password: 'correct' });

    expect(result).toEqual({
      access_token: 'mocked_token',
      user: { id: '1', username: 'Test', rol: 'ADMIN' },
    });
    expect(jwtService.sign).toHaveBeenCalled();
  });
});