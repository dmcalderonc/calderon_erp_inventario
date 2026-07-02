import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Proyecto } from '../proyectos/proyecto.entity'; 

import { User } from './user.entity';

@Entity('proyecto_usuarios')
export class ProyectoUsuario {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Proyecto, (proyecto) => proyecto.usuarios)
  proyecto: Proyecto;

  @ManyToOne(() => User)
  usuario: User;
}