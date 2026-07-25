import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Proveedor } from '../../proveedores/proveedore.entity';
import { RequirementDetail } from '../../requirements/entities/requirement-detail.entity';
import { SolicitudCompra } from '../../solicitudes-compra/entities/solicitud-compra.entity';

export enum EstadoCotizacion {
    ELEGIDA = 'ELEGIDA',
    DESCARTADA = 'DESCARTADA',
    EN_EVALUACION = 'EN_EVALUACION'
}

@Entity('cotizaciones')
export class Cotizacion {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'requerimiento_detalle_id', type: 'integer', nullable: true })
    requerimientoDetalleId: number | null;

    @ManyToOne(() => RequirementDetail, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'requerimiento_detalle_id' })
    requerimientoDetalle: RequirementDetail;

    @Column({ name: 'proveedor_id', type: 'integer' })
    proveedorId: number;

    @ManyToOne(() => Proveedor)
    @JoinColumn({ name: 'proveedor_id' })
    proveedor: Proveedor;

    @Column({ type: 'int', default: 0 })
    cantidad: number;

    @Column('decimal', { name: 'precio_unitario', precision: 12, scale: 2, default: 0 })
    precioUnitario: number;

    @Column({ name: 'tiempo_entrega_dias', type: 'int', nullable: true })
    tiempoEntregaDias: number | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    marca: string | null;

    @Column({ type: 'text', nullable: true })
    observaciones: string | null;

    @Column({ type: 'varchar', nullable: true })
    archivoRespaldoUrl: string;

    @Column({ type: 'enum', enum: EstadoCotizacion, default: EstadoCotizacion.EN_EVALUACION })
    estado: EstadoCotizacion;

    @Column({ name: 'solicitud_compra_id', type: 'integer', nullable: true })
    solicitudCompraId: number | null;

    @ManyToOne(() => SolicitudCompra, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'solicitud_compra_id' })
    solicitudCompra: SolicitudCompra;
}
