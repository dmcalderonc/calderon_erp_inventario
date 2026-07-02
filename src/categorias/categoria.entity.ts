import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Material } from '../materiales/material.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ length: 10, unique: true })
  prefijo: string; 

  @OneToMany(() => Material, (material) => material.categoria)
  materiales: Material[];
}