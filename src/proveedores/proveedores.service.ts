import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedoreDto } from './dto/update-proveedor.dto'; 
import { Proveedor } from './proveedore.entity'; 

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly proveedorRepository: Repository<Proveedor>,
  ) {}

  async create(createProveedorDto: CreateProveedorDto): Promise<Proveedor> {
    const nuevoProveedor = this.proveedorRepository.create(createProveedorDto);
    return await this.proveedorRepository.save(nuevoProveedor);
  }


  async findAll(): Promise<Proveedor[]> {
    return await this.proveedorRepository.find();
  }


  async findOne(id: number): Promise<Proveedor> {
    const proveedor = await this.proveedorRepository.findOne({ where: { id } });
    if (!proveedor) {
      throw new NotFoundException(`El proveedor con ID #${id} no fue encontrado`);
    }
    return proveedor;
  }


  async update(id: number, updateProveedorDto: UpdateProveedoreDto): Promise<Proveedor> {

    const proveedor = await this.findOne(id);
    

    this.proveedorRepository.merge(proveedor, updateProveedorDto);
    
  
    return await this.proveedorRepository.save(proveedor);
  }

  
  async remove(id: number): Promise<{ message: string }> {
    const proveedor = await this.findOne(id);
    await this.proveedorRepository.remove(proveedor);
    return { message: `El proveedor con ID #${id} ha sido eliminado.` };
  }
}