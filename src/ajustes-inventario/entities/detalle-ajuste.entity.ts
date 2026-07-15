import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AjusteInventario } from './ajustes-inventario.entity';
import { Material } from '../../materiales/material.entity';

@Entity('detalle_ajustes')
export class DetalleAjuste {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ajuste_id', type: 'uuid' })
  ajusteId: string;

  @ManyToOne(() => AjusteInventario, (ajuste) => ajuste.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ajuste_id' })
  ajuste: AjusteInventario;

  @Column({ name: 'material_id', type: 'integer' })
  materialId: number;

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Column({ name: 'stock_sistema', type: 'int' })
  stockSistema: number;

  @Column({ name: 'stock_fisico', type: 'int' })
  stockFisico: number;

  @Column({ type: 'int' })
  diferencia: number;
}