import { Order } from '../../../src/modules/orders/domain/order.entity';
import { OrderItem } from '../../../src/modules/orders/domain/order-item.entity';
import { Coupon } from '../../../src/modules/coupons/domain/coupon.entity';

// Helper para crear un OrderItem simple
function makeItem(precio: number, cantidad: number): OrderItem {
  return OrderItem.create(1, undefined, undefined, cantidad, precio, 'SIN_DESCUENTO', 0);
}

// Helper para crear un OrderItem con descuento
function makeItemWithDiscount(
  precio: number,
  cantidad: number,
  tipo: 'PORCENTAJE' | 'VALOR_FIJO',
  valor: number,
): OrderItem {
  return OrderItem.create(1, undefined, undefined, cantidad, precio, tipo, valor);
}

// Helper para construir un Order vacío
function makeOrder(items: OrderItem[]): Order {
  return new Order(1, null, items, 0, 0, 0, 0, 0, null, null, null, null, null, 'ERP', null);
}

describe('OrderItem.create()', () => {
  it('calcula subtotal correcto sin descuento', () => {
    const item = makeItem(100, 3);
    expect(item.subtotal).toBe(300);
    expect(item.descuento).toBe(0);
    expect(item.precioUnitario).toBe(100);
  });

  it('aplica descuento porcentual correctamente', () => {
    // 20% de descuento sobre $100 → precio efectivo $80 × 2 = $160
    const item = makeItemWithDiscount(100, 2, 'PORCENTAJE', 20);
    expect(item.descuento).toBeCloseTo(40); // 20% × 100 × 2 unidades
    expect(item.subtotal).toBeCloseTo(160);
  });

  it('aplica descuento de valor fijo correctamente', () => {
    // $15 de descuento fijo por unidad × 3 = $45 descuento; subtotal: (100-15)*3 = $255
    const item = makeItemWithDiscount(100, 3, 'VALOR_FIJO', 15);
    expect(item.descuento).toBeCloseTo(45);
    expect(item.subtotal).toBeCloseTo(255);
  });
});

describe('Order.calculateTotals()', () => {
  it('suma correctamente los subtotales de múltiples items', () => {
    const items = [makeItem(100, 2), makeItem(50, 4)];
    const order = makeOrder(items);
    // subtotal = 200 + 200 = 400
    expect(order.subtotal).toBe(400);
    expect(order.total).toBe(400);
  });

  it('acumula descuentos individuales de items en order.descuento', () => {
    const items = [
      makeItemWithDiscount(100, 2, 'PORCENTAJE', 10), // descuento = $20
      makeItem(50, 1),                                 // descuento = $0
    ];
    const order = makeOrder(items);
    expect(order.descuento).toBeCloseTo(20);
  });
});

describe('Order.applyCoupon()', () => {
  // Stub de Coupon para los tests
  function makeCoupon(tipo: 'PORCENTAJE' | 'VALOR_FIJO', valor: number): Coupon {
    // orden real: (id, codigo, valor, tipo, usosMaximos, usosActuales, activo, fechaExpiracion)
    return new Coupon(1, 'TEST10', valor, tipo, 10, 0, true, null);
  }

  it('aplica cupón de porcentaje sobre el subtotal', () => {
    const order = makeOrder([makeItem(200, 1)]);
    const coupon = makeCoupon('PORCENTAJE', 10); // 10% sobre $200 = $20
    order.applyCoupon(coupon);
    expect(order.descuentoCupon).toBeCloseTo(20);
    expect(order.total).toBeCloseTo(180);
    expect(order.cuponId).toBe(1);
  });

  it('aplica cupón de valor fijo sobre el subtotal', () => {
    const order = makeOrder([makeItem(200, 1)]);
    const coupon = makeCoupon('VALOR_FIJO', 50); // $50 fijo
    order.applyCoupon(coupon);
    expect(order.descuentoCupon).toBeCloseTo(50);
    expect(order.total).toBeCloseTo(150);
  });

  it('lanza error si el cupón está inactivo', () => {
    const order = makeOrder([makeItem(100, 1)]);
    const coupon = new Coupon(2, 'INACTIVO', 10, 'PORCENTAJE', 1, 0, false, null);
    expect(() => order.applyCoupon(coupon)).toThrow();
  });

  it('lanza error si el cupón ya agotó sus usos', () => {
    const order = makeOrder([makeItem(100, 1)]);
    // usosActuales === usosMaximos
    const coupon = new Coupon(3, 'AGOTADO', 10, 'PORCENTAJE', 5, 5, true, null);
    expect(() => order.applyCoupon(coupon)).toThrow();
  });

  it('lanza error si el cupón está expirado', () => {
    const order = makeOrder([makeItem(100, 1)]);
    const expired = new Date('2020-01-01');
    const coupon = new Coupon(4, 'EXPIRADO', 10, 'PORCENTAJE', 10, 0, true, expired);
    expect(() => order.applyCoupon(coupon)).toThrow();
  });
});

describe('Order.addTaxes()', () => {
  it('agrega impuesto sobre el total y actualiza total', () => {
    const order = makeOrder([makeItem(100, 1)]);
    order.addTaxes(0.18); // IGV 18%
    expect(order.impuesto).toBeCloseTo(18);
    expect(order.total).toBeCloseTo(118);
  });

  it('no modifica nada si el impuesto es 0', () => {
    const order = makeOrder([makeItem(100, 1)]);
    const totalAntes = order.total;
    order.addTaxes(0);
    expect(order.impuesto).toBe(0);
    expect(order.total).toBe(totalAntes);
  });
});
