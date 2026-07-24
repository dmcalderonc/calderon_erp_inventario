import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Put,
  Delete,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthService } from '../auth/auth.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @Roles('ADMIN')
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('ADMIN')
  async findAll(): Promise<User[]> {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id') id: string): Promise<User> {
    return await this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    const { user, rolChanged } = await this.usersService.update(id, updateUserDto);

    if (rolChanged && req.user?.id === id) {
      const token = this.authService.generateToken(user);
      return { user, token };
    }

    return { user };
  }

  @Put(':id')
  @Roles('ADMIN')
  async updatePut(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    const { user, rolChanged } = await this.usersService.update(id, updateUserDto);

    if (rolChanged && req.user?.id === id) {
      const token = this.authService.generateToken(user);
      return { user, token };
    }

    return { user };
  }

  @Patch(':id/bodegas')
  @Roles('ADMIN')
  async updateBodegas(
    @Param('id') id: string,
    @Body('bodegaIds') bodegaIds: number[],
  ) {
    const user = await this.usersService.updateBodegas(id, bodegaIds);
    return { user };
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
