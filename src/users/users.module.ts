import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { ProyectoUsuario } from './proyecto-usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, ProyectoUsuario])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], 
})
export class UsersModule {}