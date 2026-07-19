import { IsInt, IsNotEmpty, IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleEntregaDto {
    @IsInt()
    @IsNotEmpty()
    materialId: number;

    @IsInt()
    @IsNotEmpty()
    cantidad: number;
}

export class CreateEntregaDirectaDto {
    @IsInt()
    @IsNotEmpty()
    ordenCompraId: number;

    @IsInt()
    @IsNotEmpty()
    requerimientoId: number;

    @IsString()
    @IsNotEmpty()
    proyectoId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DetalleEntregaDto)
    detalles: DetalleEntregaDto[];
}