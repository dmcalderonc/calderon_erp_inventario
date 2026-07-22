import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Proyecto } from '../../proyectos/proyecto.entity';
import { User } from '../../users/user.entity';
import { DetalleSolicitud } from './detalle-solicitud.entity';
import { Cotizacion } from '../../cotizaciones/entities/cotizacion.entity';

export enum EstadoSolicitud {
    PENDIENTE = 'PENDIENTE',
    COTIZANDO = 'COTIZANDO',
    APROBADA = 'APROBADA',
    RECHAZADA = 'RECHAZADA',
}

export enum NivelPrioridad {
    ALTA = 'ALTA',
    MEDIA = 'MEDIA',
    BAJA = 'BAJA',
}

@Entity('solicitudes_compra')
export class SolicitudCompra {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'varchar', unique: true })
    codigo: string;

    @Column({ name: 'proyecto_id', type: 'uuid' })
    proyectoId: string;

    @ManyToOne(() => Proyecto)
    @JoinColumn({ name: 'proyecto_id' })
    proyecto: Proyecto;

    @Column({ name: 'usuario_solicitante_id', type: 'uuid', nullable: true })
    usuarioSolicitanteId: string;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'usuario_solicitante_id' })
    usuarioSolicitante: User;

    @CreateDateColumn({ name: 'fecha_solicitud' })
    fechaSolicitud: Date;

    @Column({ type: 'enum', enum: EstadoSolicitud, default: EstadoSolicitud.PENDIENTE })
    estado: EstadoSolicitud;

    @Column({ type: 'enum', enum: NivelPrioridad, default: NivelPrioridad.MEDIA })
    nivelPrioridad: NivelPrioridad;

    @OneToMany(() => DetalleSolicitud, (detalle) => detalle.solicitud, { cascade: true })
    detalles: DetalleSolicitud[];

    @OneToMany(() => Cotizacion, (cotizacion) => cotizacion.solicitud)
    cotizaciones: Cotizacion[];
}