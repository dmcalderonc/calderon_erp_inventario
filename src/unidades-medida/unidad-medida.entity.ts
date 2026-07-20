import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Material } from '../materiales/material.entity';

@Entity('unidades_medida')
export class UnidadMedida {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ length: 10, unique: true })
  simbolo: string;

  @OneToMany(() => Material, (material) => material.unidadMedida)
  materiales: Material[];
}
