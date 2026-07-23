import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { OrdenCompra } from './orden-compra.entity';
import { Material } from '../../materiales/material.entity';

@Entity('detalle_orden_compra')
export class DetalleOrdenCompra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('int')
  cantidad: number;

  @Column('decimal', { precision: 12, scale: 2 })
  precioUnitario: number;

  @Column({ name: 'material_id', type: 'integer' })
  materialId: number;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @ManyToOne(() => OrdenCompra, (orden) => orden.detalles)
  ordenCompra: OrdenCompra;
}