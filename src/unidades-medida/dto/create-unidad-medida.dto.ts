import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateUnidadMedidaDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsString({ message: 'El símbolo debe ser un texto' })
  @IsNotEmpty({ message: 'El símbolo es obligatorio' })
  @MaxLength(10, { message: 'El símbolo no puede tener más de 10 caracteres' })
  simbolo: string;
}
