/**
 * Tipo de entrada para la capa de aplicación (use-case).
 * Independiente de cualquier DTO HTTP — cumple con la dirección correcta
 * de dependencias en Arquitectura Hexagonal.
 */
export interface OrderItemInput {
  productoId: number;
  tallaId?: number;
  colorId?: number;
  cantidad: number;
  precioUnitario?: number;
  omitirDescuento?: boolean;
}

export interface CreateOrderInput {
  clienteId: number;
  usuarioId?: number;
  medioPagoId?: number;
  tipoComprobanteId?: number;
  direccionEnvio?: string;
  observaciones?: string;
  origen?: 'ERP' | 'ECOMMERCE';
  cuponCodigo?: string;
  fechaEntrega?: string;
  detalles: OrderItemInput[];
}
