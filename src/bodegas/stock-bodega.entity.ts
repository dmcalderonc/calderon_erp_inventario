import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Bodega } from './bodegas.entity';
import { Material } from '../materiales/material.entity';

@Entity('stock_bodega')
export class StockBodega {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Bodega)
  bodega: Bodega;

  @ManyToOne(() => Material)
  material: Material;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cantidadDisponible: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cantidadReservada: number;
}