import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { DetalleOrdenCompra } from './detalle-orden-compra.entity';
import { Proveedor } from '../../proveedores/proveedore.entity';

@Entity('ordenes_compra')
export class OrdenCompra {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'varchar', length: 20 })
  codigo?: string; 

  @Column({ name: 'proveedor_id', type: 'integer', nullable: true })
  proveedorId?: number;

  @ManyToOne(() => Proveedor)
  @JoinColumn({ name: 'proveedor_id' })
  proveedor?: Proveedor;

  @Column({ type: 'date' })
  fechaEmision?: Date;

  @Column({
    type: 'enum',
    enum: ['BORRADOR', 'EMITIDA', 'RECIBIDA', 'CANCELADA','PENDIENTE'],
    default: 'BORRADOR'
  })
  estado?: string;

  @Column('decimal', { precision: 12, scale: 2 })
  subtotal?: number;

  @Column('decimal', { precision: 12, scale: 2 })
  impuestos?: number;

  @Column('decimal', { precision: 12, scale: 2 })
  total?: number;

  @OneToMany(() => DetalleOrdenCompra, (detalle) => detalle.ordenCompra, { cascade: true })
  detalles?: DetalleOrdenCompra[];
}