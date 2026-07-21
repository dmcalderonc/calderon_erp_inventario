import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('El correo electrónico ya se encuentra registrado.');
    }

    const newUser = this.userRepository.create({
      nombre: createUserDto.username,
      email: createUserDto.email,
      password: createUserDto.password,
      rol: createUserDto.rol,
    });

    return await this.userRepository.save(newUser);
  }


  async findByEmailForLogin(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        nombre: true,
        email: true,
        password: true,
        rol: true,
        estado: true,
      },
    });
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (emailExists) {
        throw new BadRequestException('El correo electrónico ya está en uso por otro usuario.');
      }
    }

    const dataToUpdate = {
      ...(updateUserDto.username && { nombre: updateUserDto.username }),
      ...(updateUserDto.email && { email: updateUserDto.email }),
      ...(updateUserDto.password && { password: updateUserDto.password }),
      ...(updateUserDto.rol && { rol: updateUserDto.rol }),
    };

    const updatedUser = this.userRepository.merge(user, dataToUpdate);
    return await this.userRepository.save(updatedUser);
  }

  async remove(id: string): Promise<any> {
    const user = await this.findOne(id);
    const userDeleted = { id: user.id, nombre: user.nombre };
    await this.userRepository.remove(user);
    return userDeleted; 
  }
}