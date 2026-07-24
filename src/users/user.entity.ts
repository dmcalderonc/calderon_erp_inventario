import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Bodega } from '../bodegas/bodegas.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  SOLICITANTE = 'SOLICITANTE',
  BODEGUERO = 'BODEGUERO',
  COMPRADOR = 'COMPRADOR',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nombre?: string;

  @Column({ type: 'varchar', unique: true })
  email?: string;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  password?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.SOLICITANTE })
  rol: UserRole;

  @Column({ type: 'boolean', default: true })
  estado?: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  fechaCreacion?: Date;

  @UpdateDateColumn()
  fechaActualizacion?: Date;

  @ManyToMany(() => Bodega, (bodega) => bodega.usuarios, { eager: false })
  @JoinTable({
    name: 'user_bodegas',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'bodegaId', referencedColumnName: 'id' },
  })
  bodegasAsignadas: Bodega[];

  @Column({ type: 'varchar', nullable: true })
  googleId?: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl?: string;
}