import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { DetalleMovimiento } from './detalle-movimiento.entity';
import { User } from '../../users/user.entity';
import { Bodega } from '../../bodegas/bodegas.entity'; 

export enum TipoMovimiento {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export enum EstadoMovimiento {
  PROCESADO = 'PROCESADO',
  ANULADO = 'ANULADO',
}

@Entity('movimientos_inventario')
export class MovimientoInventario {
  @PrimaryGeneratedColumn('uuid')
  id?: string;

  @Column({ type: 'enum', enum: TipoMovimiento })
  tipo?: TipoMovimiento;

  @CreateDateColumn({ name: 'fecha' })
  fecha?: Date;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: User;

  @Column({ name: 'bodega_origen_id', type: 'integer', nullable: true })
  bodegaOrigenId?: number;

  @ManyToOne(() => Bodega)
  @JoinColumn({ name: 'bodega_origen_id' })
  bodegaOrigen?: Bodega;

  @Column({ name: 'bodega_destino_id', type: 'integer', nullable: true })
  bodegaDestinoId?: number;

  @ManyToOne(() => Bodega)
  @JoinColumn({ name: 'bodega_destino_id' })
  bodegaDestino?: Bodega;

  @Column({ type: 'enum', enum: EstadoMovimiento, default: EstadoMovimiento.PROCESADO })
  estado?: EstadoMovimiento;

  @OneToMany(() => DetalleMovimiento, (detalle) => detalle.movimiento, { cascade: true })
  detalles?: DetalleMovimiento[];
}