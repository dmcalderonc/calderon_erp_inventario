import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Proyecto } from '../proyectos/proyecto.entity';

@Entity('bodegas')
export class Bodega {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 255 })
  ubicacion: string;

  @Column({ name: 'is_principal', type: 'boolean', default: false })
  isPrincipal: boolean;

  @Column({ name: 'proyecto_id', type: 'uuid', nullable: true })
  proyectoId: string;

  @OneToOne(() => Proyecto, (proyecto) => proyecto.bodega, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;
}