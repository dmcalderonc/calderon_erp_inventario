import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { Bodega } from '../bodegas/bodegas.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Bodega)
    private readonly bodegaRepository: Repository<Bodega>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('El correo electrónico ya se encuentra registrado.');
    }

    if (createUserDto.rol === 'BODEGUERO' && !createUserDto.bodegaAsignadaId) {
      throw new BadRequestException('Los bodegueros deben tener una bodega asignada.');
    }

    if (createUserDto.bodegaAsignadaId) {
      const bodegaExists = await this.bodegaRepository.findOne({
        where: { id: createUserDto.bodegaAsignadaId },
      });
      if (!bodegaExists) {
        throw new BadRequestException(`La bodega con ID ${createUserDto.bodegaAsignadaId} no existe.`);
      }
    }

    const newUser = this.userRepository.create({
      nombre: createUserDto.nombre,
      email: createUserDto.email,
      password: await bcrypt.hash(createUserDto.password, 10),
      rol: createUserDto.rol,
      bodegaAsignadaId: createUserDto.rol === 'BODEGUERO' ? createUserDto.bodegaAsignadaId : null,
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
        bodegaAsignadaId: true,
      },
    });
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      relations: { bodegaAsignada: true },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { bodegaAsignada: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<{ user: User; rolChanged: boolean }> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (emailExists) {
        throw new BadRequestException('El correo electrónico ya está en uso por otro usuario.');
      }
    }

    const rolChanged = !!updateUserDto.rol && updateUserDto.rol !== user.rol;

    const dataToUpdate: Record<string, any> = {};

    if (updateUserDto.nombre) dataToUpdate.nombre = updateUserDto.nombre;
    if (updateUserDto.email) dataToUpdate.email = updateUserDto.email;
    if (updateUserDto.password) dataToUpdate.password = await bcrypt.hash(updateUserDto.password, 10);
    if (updateUserDto.rol) dataToUpdate.rol = updateUserDto.rol;
    if (typeof updateUserDto.estado === 'boolean') dataToUpdate.estado = updateUserDto.estado;

    if (updateUserDto.rol === 'BODEGUERO' && updateUserDto.bodegaAsignadaId) {
      const bodegaExists = await this.bodegaRepository.findOne({
        where: { id: updateUserDto.bodegaAsignadaId },
      });
      if (!bodegaExists) {
        throw new BadRequestException(`La bodega con ID ${updateUserDto.bodegaAsignadaId} no existe.`);
      }
      dataToUpdate.bodegaAsignadaId = updateUserDto.bodegaAsignadaId;
    } else if (updateUserDto.rol && updateUserDto.rol !== 'BODEGUERO') {
      dataToUpdate.bodegaAsignadaId = null;
    }

    const updatedUser = this.userRepository.merge(user, dataToUpdate);
    const saved = await this.userRepository.save(updatedUser);
    return { user: saved, rolChanged };
  }

  async remove(id: string): Promise<any> {
    const user = await this.findOne(id);
    const userDeleted = { id: user.id, nombre: user.nombre };
    await this.userRepository.remove(user);
    return userDeleted;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { googleId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async linkGoogleId(id: string, googleId: string, avatarUrl?: string): Promise<User> {
    const user = await this.findOne(id);
    user.googleId = googleId;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    return await this.userRepository.save(user);
  }

  async unlinkGoogleId(id: string): Promise<void> {
    const user = await this.findOne(id);
    user.googleId = undefined;
    user.avatarUrl = undefined;
    await this.userRepository.save(user);
  }

  async createFromGoogle(data: { email: string; nombre: string; googleId: string; avatarUrl?: string }): Promise<User> {
    const newUser = this.userRepository.create({
      email: data.email,
      nombre: data.nombre,
      googleId: data.googleId,
      avatarUrl: data.avatarUrl,
      password: undefined,
      rol: UserRole.SOLICITANTE,
    });
    return await this.userRepository.save(newUser);
  }
}
