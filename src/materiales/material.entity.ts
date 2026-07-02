import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Categoria } from '../categorias/categoria.entity';

@Entity('materiales')
export class Material {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ unique: true })
  sku: string; 

  @Column({ type: 'enum', enum: ['U', 'KG', 'M', 'M2'] })
  unidad_medida: string;

  @ManyToOne(() => Categoria, (categoria) => categoria.materiales, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria;
}