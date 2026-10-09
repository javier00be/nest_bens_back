import { Product } from '../../domain/product.entity';

// Tipo parcial que refleja lo que devuelve Prisma al hacer findUnique/findMany con includes
// Usamos 'any' solo aquí, en el boundary, y no se propaga al resto del código.
type PrismaProductRaw = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  precio: { toString(): string } | number; // Prisma Decimal
  categoriaId: number;
  marcaId: number;
  imagenes?: unknown;
  sku?: string | null;
  tipoDescuento?: string;
  valorDescuento?: { toString(): string } | number | null;
  createdAt?: Date;
  categoria?: { id: number; nombre: string } | null;
  marca?: { id: number; nombre: string } | null;
  colores?: Array<{ nombre: string }>;
};

/**
 * Convierte un registro Prisma (con includes) a la entidad de dominio Product.
 * Este es el único lugar donde vivimos con la impedancia Prisma ↔ Domain.
 */
export function toDomainProduct(raw: PrismaProductRaw): Product {
  return {
    id: raw.id,
    nombre: raw.nombre,
    descripcion: raw.descripcion ?? null,
    precio: Number(raw.precio),
    categoriaId: raw.categoriaId,
    marcaId: raw.marcaId,
    imagenes: Array.isArray(raw.imagenes) ? (raw.imagenes as string[]) : [],
    sku: raw.sku ?? undefined,
    tipoDescuento: (raw.tipoDescuento as Product['tipoDescuento']) ?? 'SIN_DESCUENTO',
    valorDescuento: raw.valorDescuento != null ? Number(raw.valorDescuento) : undefined,
    createdAt: raw.createdAt,
    categoria: raw.categoria ?? undefined,
    marca: raw.marca ?? undefined,
    color: raw.colores?.map((c) => c.nombre) ?? [],
  };
}
