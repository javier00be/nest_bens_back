import { Product } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class Producto implements Product {
    id: number;
    sku: string;
    nombre: string;
    descripcion: string | null;
    precio: Decimal;
    cantidad: number;
    estado: number;
    imagen: string | null;
    createdAt: Date;
    updatedAt: Date;
}
