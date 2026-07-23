import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Traspaso } from './traspaso.entity';
import { Material } from '../../materiales/material.entity';

@Entity('detalles_traspaso')
export class DetalleTraspaso {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'traspaso_id', type: 'int' })
  traspasoId: number;

  @ManyToOne(() => Traspaso, (t) => t.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'traspaso_id' })
  traspaso: Traspaso;

  @Column({ name: 'material_id', type: 'int' })
  materialId: number;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column({ type: 'int' })
  cantidad: number;

  @Column({ name: 'cantidad_recibida', type: 'int', default: 0 })
  cantidadRecibida: number;
}
