import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('proveedores')
export class Proveedor {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'varchar', length: 13, unique: true })
  ruc?: string;

  @Column({ type: 'varchar' })
  razon_social?: string;

  @Column({ type: 'varchar' })
  email?: string;

  @Column({ type: 'varchar' })
  telefono?: string;

  @Column({ type: 'varchar' })
  direccion?: string;

  @Column({ type: 'boolean', default: true })
  estado?: boolean;

  @CreateDateColumn()
  fechaCreacion?: Date;

  @UpdateDateColumn()
  fechaActualizacion?: Date;
}