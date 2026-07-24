import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

    if (createUserDto.rol === 'BODEGUERO' && (!createUserDto.bodegaIds || createUserDto.bodegaIds.length === 0)) {
      throw new BadRequestException('Los bodegueros deben tener al menos una bodega asignada.');
    }

    let bodegasAsignadas: Bodega[] = [];
    if (createUserDto.bodegaIds && createUserDto.bodegaIds.length > 0) {
      bodegasAsignadas = await this.bodegaRepository.findBy({ id: In(createUserDto.bodegaIds) });
      if (bodegasAsignadas.length !== createUserDto.bodegaIds.length) {
        throw new BadRequestException('Una o más bodegas especificadas no existen.');
      }
    }

    const newUser = this.userRepository.create({
      nombre: createUserDto.nombre,
      email: createUserDto.email,
      password: await bcrypt.hash(createUserDto.password, 10),
      rol: createUserDto.rol,
      bodegasAsignadas,
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
        isActive: true,
      },
    });
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      relations: { bodegasAsignadas: true },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { bodegasAsignadas: true },
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

    if (updateUserDto.nombre) user.nombre = updateUserDto.nombre;
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.password) user.password = await bcrypt.hash(updateUserDto.password, 10);
    if (updateUserDto.rol) user.rol = updateUserDto.rol;
    if (typeof updateUserDto.estado === 'boolean') user.estado = updateUserDto.estado;
    if (typeof updateUserDto.isActive === 'boolean') user.isActive = updateUserDto.isActive;

    if (updateUserDto.bodegaIds !== undefined) {
      if (updateUserDto.rol === 'BODEGUERO' && updateUserDto.bodegaIds.length === 0) {
        throw new BadRequestException('Los bodegueros deben tener al menos una bodega asignada.');
      }
      if (updateUserDto.bodegaIds.length > 0) {
        user.bodegasAsignadas = await this.bodegaRepository.findBy({ id: In(updateUserDto.bodegaIds) });
      } else {
        user.bodegasAsignadas = [];
      }
    } else if (updateUserDto.rol && updateUserDto.rol !== 'BODEGUERO') {
      user.bodegasAsignadas = [];
    }

    const saved = await this.userRepository.save(user);
    return { user: saved, rolChanged };
  }

  async updateBodegas(id: string, bodegaIds: number[]): Promise<User> {
    const user = await this.findOne(id);

    if (user.rol === 'BODEGUERO' && bodegaIds.length === 0) {
      throw new BadRequestException('Los bodegueros deben tener al menos una bodega asignada.');
    }

    user.bodegasAsignadas = await this.bodegaRepository.findBy({ id: In(bodegaIds) });
    return await this.userRepository.save(user);
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
