import { Controller, Post, Body, Get, Req, Res, UseGuards, Delete, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return { message: 'Inicio de sesión exitoso', data: result };
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: any) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://stockly.uaeftt-ute.site';

    try {
      const googleUser = req.user;

      if (!googleUser || !googleUser.googleId) {
        return res.redirect(`${frontendUrl}/auth/google/callback?error=no_user_data`);
      }

      let user = await this.usersService.findByGoogleId(googleUser.googleId);

      if (!user) {
        user = await this.usersService.findByEmail(googleUser.email);
        if (user) {
          user = await this.usersService.linkGoogleId(user.id, googleUser.googleId, googleUser.avatarUrl);
        } else {
          user = await this.usersService.createFromGoogle({
            email: googleUser.email,
            nombre: googleUser.nombre,
            googleId: googleUser.googleId,
            avatarUrl: googleUser.avatarUrl,
          });
        }
      }

      if (user.estado === false) {
        return res.redirect(`${frontendUrl}/auth/google/callback?error=account_disabled`);
      }

      const loginResponse = await this.authService.loginWithUser(user);
      const token = loginResponse.access_token;

      return res.redirect(`${frontendUrl}/auth/google/callback?token=${token}`);
    } catch (error) {
      console.error('Error en Google callback:', error);
      return res.redirect(`${frontendUrl}/auth/google/callback?error=auth_failed`);
    }
  }

  @Delete('google')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async unlinkGoogle(@Req() req: any) {
    await this.usersService.unlinkGoogleId(req.user.id);
    return { message: 'Cuenta de Google desvinculada exitosamente' };
  }
}