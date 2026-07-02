import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @Column({ type: 'varchar' })
  password?: string;


  @Column({ type: 'enum', enum: UserRole, default: UserRole.SOLICITANTE })
  rol: UserRole;

  @Column({ type: 'boolean', default: true })
  estado?: boolean;

  @CreateDateColumn()
  fechaCreacion?: Date;

  @UpdateDateColumn()
  fechaActualizacion?: Date;
}