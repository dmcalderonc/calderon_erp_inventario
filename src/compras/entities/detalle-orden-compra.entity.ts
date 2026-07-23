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

  @Column({ name: 'requerimiento_detalle_id', type: 'int', nullable: true })
  requerimientoDetalleId: number | null;

  @Column({ type: 'int', nullable: true })
  tiempoEntregaDias: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  marca: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'archivo_adjunto_url', type: 'varchar', nullable: true })
  archivoAdjuntoUrl: string | null;
}