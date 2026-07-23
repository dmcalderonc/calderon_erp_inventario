import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SolicitudCompra } from '../../solicitudes-compra/entities/solicitud-compra.entity';
import { Proveedor } from '../../proveedores/proveedore.entity';
import { User } from '../../users/user.entity';

export enum EstadoCotizacion {
    ELEGIDA = 'ELEGIDA',
    DESCARTADA = 'DESCARTADA',
    EN_EVALUACION = 'EN_EVALUACION'
}

@Entity('cotizaciones')
export class Cotizacion {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'solicitud_id', type: 'integer' })
    solicitudId: number;

    @ManyToOne(() => SolicitudCompra, (solicitud) => solicitud.cotizaciones, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'solicitud_id' })
    solicitud: SolicitudCompra;

    @Column({ name: 'proveedor_id', type: 'integer' })
    proveedorId: number;

    @ManyToOne(() => Proveedor)
    @JoinColumn({ name: 'proveedor_id' })
    proveedor: Proveedor;

    @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
    usuarioId: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'usuario_id' })
    usuario: User;

    @Column('decimal', { precision: 12, scale: 2 })
    precioOfertadoTotal: number;

    @Column({ type: 'varchar', nullable: true })
    archivoRespaldoUrl: string;

    @Column({ type: 'enum', enum: EstadoCotizacion, default: EstadoCotizacion.EN_EVALUACION })
    estado: EstadoCotizacion;
}