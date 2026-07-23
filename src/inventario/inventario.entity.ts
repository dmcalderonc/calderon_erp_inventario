import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Material } from '../materiales/material.entity'; 
import { Bodega } from '../bodegas/bodegas.entity';     

@Entity('stock_bodega')
@Index(['materialId', 'bodegaId'], { unique: true })
export class Inventario {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ name: 'material_id', type: 'integer' })
  materialId: number;

  @Column({ name: 'bodega_id', type: 'integer' })
  bodegaId: number;

  @Column({ type: 'int', default: 0 })
  cantidad_disponible?: number;

  @Column({ type: 'int', default: 0 })
  cantidad_reservada?: number;

  @ManyToOne(() => Material, (material) => material.id)
  @JoinColumn({ name: 'material_id' })
  material?: Material;

  @ManyToOne(() => Bodega, (bodega) => bodega.id)
  @JoinColumn({ name: 'bodega_id' })
  bodega?: Bodega;
}
