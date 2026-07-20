import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SolicitudCompra } from './solicitud-compra.entity';
import { Material } from '../../materiales/material.entity';

@Entity('detalles_solicitud')
export class DetalleSolicitud {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'solicitud_id', type: 'integer' })
    solicitudId: number;

    @ManyToOne(() => SolicitudCompra, (solicitud) => solicitud.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'solicitud_id' })
    solicitud: SolicitudCompra;

    @Column({ name: 'material_id', type: 'integer' })
    materialId: number;

    @ManyToOne(() => Material)
    @JoinColumn({ name: 'material_id' })
    material: Material;

    @Column({ type: 'int' })
    cantidadRequerida: number;
}