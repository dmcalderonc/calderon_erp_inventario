import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
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

  @CreateDateColumn()
  fechaCreacion?: Date;

  @UpdateDateColumn()
  fechaActualizacion?: Date;

  @Column({ name: 'bodega_asignada_id', type: 'int', nullable: true })
  bodegaAsignadaId: number | null;

  @ManyToOne(() => Bodega, { nullable: true })
  @JoinColumn({ name: 'bodega_asignada_id' })
  bodegaAsignada: Bodega | null;

  @Column({ type: 'varchar', nullable: true })
  googleId?: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl?: string;
}