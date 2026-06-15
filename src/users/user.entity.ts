// src/users/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users') // Nombre de la tabla en PostgreSQL
export class User {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ type: 'varchar', length: 150 })
  nombre?: string;

  @Column({ type: 'varchar', unique: true })
  email?: string;

  @Column({ type: 'varchar' })
  passwordHash?: string;

  // Roles base para el sistema de requerimientos
  @Column({ type: 'enum', enum: ['ADMIN', 'SOLICITANTE', 'BODEGUERO', 'COMPRADOR'], default: 'SOLICITANTE' })
  rol?: string;

  @Column({ type: 'boolean', default: true })
  estado?: boolean;

  @CreateDateColumn()
  fechaCreacion?: Date;

  @UpdateDateColumn()
  fechaActualizacion?: Date;
}