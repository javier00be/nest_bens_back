import { IsString, IsNumber, IsOptional, Min, IsInt, IsNotEmpty } from 'class-validator';

export class CreateProductoDto {
    @IsString()
    @IsNotEmpty()
    sku: string;

    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsOptional()
    @IsString()
    descripcion?: string;

    @IsNumber()
    @Min(0)
    precio: number;

    @IsInt()
    @Min(0)
    cantidad: number;

    @IsOptional()
    @IsInt()
    estado?: number;

    @IsOptional()
    @IsString()
    imagen?: string;
}
