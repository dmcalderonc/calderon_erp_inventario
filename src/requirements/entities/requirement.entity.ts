import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Proyecto } from '../../proyectos/proyecto.entity';
import { RequirementDetail } from '../entities/requirement-detail.entity';

export enum RequirementStatus {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  PARCIALMENTE_ATENDIDO = 'PARCIALMENTE_ATENDIDO',
  ATENDIDO = 'ATENDIDO',
  RECHAZADO = 'RECHAZADO',
  DESPACHADO = 'DESPACHADO',
}

@Entity('requerimientos')
export class Requirement {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'proyecto_id', type: 'uuid' })
  proyectoId: string;

  @ManyToOne(() => Proyecto, { nullable: false })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto: Proyecto;

  @Column({ name: 'usuario_solicitante_id', type: 'uuid', nullable: true })
  usuarioSolicitanteId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_solicitante_id' })
  usuarioSolicitante: User;

  @CreateDateColumn({ name: 'fecha_solicitud' })
  fechaSolicitud: Date;

  @Column({
    type: 'enum',
    enum: RequirementStatus,
    default: RequirementStatus.PENDIENTE,
  })
  estado: RequirementStatus;

  @OneToMany(() => RequirementDetail, (detalle) => detalle.requirement, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  detalles: RequirementDetail[];
}
