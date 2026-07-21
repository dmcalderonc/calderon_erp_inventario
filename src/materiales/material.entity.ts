import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Categoria } from '../categorias/categoria.entity';
import { UnidadMedida } from '../unidades-medida/unidad-medida.entity';

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

  @Column({ type: 'text', nullable: true })
  imagen: string;

  @ManyToOne(() => UnidadMedida, (unidad) => unidad.materiales, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unidad_medida_id' })
  unidadMedida: UnidadMedida;

  @ManyToOne(() => Categoria, (categoria) => categoria.materiales, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoria_id' })
  categoria: Categoria;
}
