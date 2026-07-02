import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Requirement } from './requirement.entity';
import { Material } from '../../materiales/material.entity'; 

export enum ItemStatus {
  PENDIENTE = 'PENDIENTE',
  DESPACHADO = 'DESPACHADO',
}

@Entity('detalles_requerimiento')
export class RequirementDetail {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'requerimiento_id', type: 'integer' })
  requerimientoId: number;

  @ManyToOne(() => Requirement, (req) => req.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requerimiento_id' })
  requirement: Requirement;

  @Column({ name: 'material_id', type: 'integer' })
  materialId: number;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column({ name: 'cantidad_solicitada', type: 'decimal', precision: 10, scale: 2 })
  cantidadSolicitada: number;

  @Column({ name: 'cantidad_despachada', type: 'decimal', precision: 10, scale: 2, default: 0 })
  cantidadDespachada: number;

  @Column({ type: 'enum', enum: ItemStatus, default: ItemStatus.PENDIENTE })
  estadoItem: ItemStatus;
}