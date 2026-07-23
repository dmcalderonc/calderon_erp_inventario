import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Bodega } from '../../bodegas/bodegas.entity';
import { User } from '../../users/user.entity';
import { DetalleTraspaso } from './detalle-traspaso.entity';

export enum EstadoTraspaso {
  PENDIENTE = 'PENDIENTE',
  EN_TRANSITO = 'EN_TRANSITO',
  RECIBIDO = 'RECIBIDO',
  CANCELADO = 'CANCELADO',
}

@Entity('traspasos')
export class Traspaso {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  codigo: string;

  @Column({ name: 'bodega_origen_id', type: 'int' })
  bodegaOrigenId: number;

  @ManyToOne(() => Bodega)
  @JoinColumn({ name: 'bodega_origen_id' })
  bodegaOrigen: Bodega;

  @Column({ name: 'bodega_destino_id', type: 'int' })
  bodegaDestinoId: number;

  @ManyToOne(() => Bodega)
  @JoinColumn({ name: 'bodega_destino_id' })
  bodegaDestino: Bodega;

  @Column({ name: 'usuario_origen_id', type: 'uuid' })
  usuarioOrigenId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_origen_id' })
  usuarioOrigen: User;

  @Column({ name: 'usuario_destino_id', type: 'uuid', nullable: true })
  usuarioDestinoId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'usuario_destino_id' })
  usuarioDestino: User | null;

  @Column({ type: 'varchar', length: 20, default: EstadoTraspaso.PENDIENTE })
  estado: EstadoTraspaso;

  @CreateDateColumn({ name: 'fecha_creacion' })
  fechaCreacion: Date;

  @Column({ name: 'fecha_envio', type: 'timestamp', nullable: true })
  fechaEnvio: Date | null;

  @Column({ name: 'fecha_recepcion', type: 'timestamp', nullable: true })
  fechaRecepcion: Date | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'requerimiento_detalle_id', type: 'int', nullable: true })
  requerimientoDetalleId: number | null;

  @OneToMany(() => DetalleTraspaso, (d) => d.traspaso, { cascade: true, onDelete: 'CASCADE' })
  detalles: DetalleTraspaso[];
}
