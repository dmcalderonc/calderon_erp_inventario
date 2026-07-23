import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Bodega } from '../../bodegas/bodegas.entity';
import { User } from '../../users/user.entity';
import { DetalleAjuste } from './detalle-ajuste.entity';

@Entity('ajustes_inventario')
export class AjusteInventario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bodega_id', type: 'integer' })
  bodegaId: number;

  @ManyToOne(() => Bodega)
  @JoinColumn({ name: 'bodega_id' })
  bodega: Bodega;

  @Column({ name: 'usuario_autorizador_id', type: 'uuid' })
  usuarioAutorizadorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_autorizador_id' })
  usuarioAutorizador: User;

  @CreateDateColumn({ name: 'fecha_ajuste' })
  fechaAjuste: Date;

  @Column({ type: 'text' })
  motivo: string;

  @OneToMany(() => DetalleAjuste, (detalle) => detalle.ajuste, { cascade: true })
  detalles: DetalleAjuste[];
}