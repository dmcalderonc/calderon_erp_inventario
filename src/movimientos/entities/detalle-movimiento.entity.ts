import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { MovimientoInventario } from './movimiento-inventario.entity';
import { Material } from '../../materiales/material.entity';

@Entity('detalles_movimiento')
export class DetalleMovimiento {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'movimiento_id', type: 'uuid' })
  movimientoId: string;

  @ManyToOne(() => MovimientoInventario, (mov) => mov.detalles)
  @JoinColumn({ name: 'movimiento_id' })
  movimiento: MovimientoInventario;

  @Column({ name: 'material_id', type: 'integer' })
  materialId: number;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cantidad: number;
}