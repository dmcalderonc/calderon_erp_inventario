import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { OrdenCompra } from './orden-compra.entity';


@Entity('detalle_orden_compra')
export class DetalleOrdenCompra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 12, scale: 2 })
  cantidad: number;

  @Column('decimal', { precision: 12, scale: 2 })
  precioUnitario: number;

  @ManyToOne(() => OrdenCompra, (orden) => orden.detalles)
  ordenCompra: OrdenCompra;

  // @ManyToOne(() => Material, ...) 
  // materialId: number;
}