import {
  PrismaClient,
  TipoCompra,
  EstadoCompra,
  TipoMovimiento,
  EstadoPedido,
  EstadoPago,
  OrigenPedido,
  TipoCupon,
  EstadoProduccion,
  type Proveedor,
  type Articulo,
  type Cliente,
  type Direccion,
  type Producto,
  type Color,
  type Inventario,
  type Cupon,
} from '@prisma/client';

const prisma = new PrismaClient();

const N = 100;
const PROVEEDOR_N = 10;
const CLIENTE_N = 20;
const RANGE_START = new Date('2026-04-01T00:00:00.000Z').getTime();
const RANGE_END = new Date('2026-06-30T23:59:59.000Z').getTime();

function randomDate(after?: Date): Date {
  const min = after ? Math.max(after.getTime(), RANGE_START) : RANGE_START;
  const max = RANGE_END;
  return new Date(min + Math.random() * Math.max(max - min, 0));
}

function timestamps(after?: Date) {
  const createdAt = randomDate(after);
  const updatedAt = randomDate(createdAt);
  return { createdAt, updatedAt };
}

// Genera createdAt/updatedAt con una brecha corta y controlada (en horas),
// usada para reflejar los tiempos promedio Postest medidos en la tesis
// (Dimensión: Aprovisionamiento, Producción, Ventas y Distribución).
function tightTimestamps(after: Date | undefined, minHours: number, maxHours: number) {
  const createdAt = randomDate(after);
  const gapMs = (minHours + Math.random() * (maxHours - minHours)) * 3_600_000;
  const updatedAt = new Date(Math.min(createdAt.getTime() + gapMs, RANGE_END));
  return { createdAt, updatedAt };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function unicoConPatron(usados: Set<string>, generar: () => string): string {
  let valor: string;
  do {
    valor = generar();
  } while (usados.has(valor));
  usados.add(valor);
  return valor;
}

// DNI peruano: 8 dígitos, sin patrón secuencial (ej. 74973434, 10666170)
function generarDni(usados: Set<string>): string {
  return unicoConPatron(usados, () => String(randInt(10_000_000, 89_999_999)));
}

// RUC peruano de persona jurídica: "20" + 8 dígitos + dígito verificador (ej. 20437194590)
function generarRuc(usados: Set<string>): string {
  return unicoConPatron(usados, () => `20${randInt(10_000_000, 89_999_999)}${randInt(0, 9)}`);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const NOMBRES = ['Luis', 'Carlos', 'José', 'Miguel', 'Jorge', 'Fernando', 'Diego', 'Andrés', 'Ricardo', 'Manuel', 'María', 'Ana', 'Rosa', 'Carmen', 'Lucía', 'Patricia', 'Karen', 'Diana', 'Fiorella', 'Milagros'];
const APELLIDOS = ['Quispe', 'Mamani', 'Flores', 'Rojas', 'Torres', 'Vargas', 'Castillo', 'Ramírez', 'Chávez', 'Huamán', 'Salazar', 'Paredes', 'Espinoza', 'Reyes', 'Cárdenas', 'Aguirre', 'Medina', 'Cruz', 'Delgado', 'Vega'];
const DISTRITOS = ['San Juan de Lurigancho', 'Los Olivos', 'San Miguel', 'Miraflores', 'Surco', 'La Molina', 'Comas', 'Ate', 'San Isidro', 'Barranco', 'Chorrillos', 'Villa El Salvador', 'San Borja', 'Pueblo Libre', 'Jesús María', 'Magdalena del Mar', 'Independencia', 'Callao', 'Rímac', 'Breña'];
const PROVEEDOR_NOMBRES = ['Textiles Andinos', 'Importaciones del Sur', 'Confecciones Lima', 'Distribuidora Nortex', 'Insumos Textiles Perú', 'Hilos y Telas', 'Textil Pacífico', 'Comercial Andina', 'Manufacturas del Norte', 'Grupo Textil Perú'];
const ARTICULOS_BASE: { nombre: string; unidad: string }[] = [
  { nombre: 'Tela Algodón', unidad: 'metros' },
  { nombre: 'Tela Denim', unidad: 'metros' },
  { nombre: 'Tela Poliéster', unidad: 'metros' },
  { nombre: 'Tela Drill', unidad: 'metros' },
  { nombre: 'Tela Jersey', unidad: 'metros' },
  { nombre: 'Hilo Poliéster', unidad: 'kg' },
  { nombre: 'Hilo Algodón', unidad: 'kg' },
  { nombre: 'Botones', unidad: 'unidades' },
  { nombre: 'Cierres', unidad: 'unidades' },
  { nombre: 'Elástico', unidad: 'metros' },
  { nombre: 'Etiquetas', unidad: 'unidades' },
  { nombre: 'Entretela', unidad: 'metros' },
  { nombre: 'Broches', unidad: 'unidades' },
  { nombre: 'Cinta Sesgo', unidad: 'metros' },
  { nombre: 'Forro', unidad: 'metros' },
];
const PRODUCTO_BASE = ['Polo Básico', 'Polo Oversize', 'Camisa Casual', 'Camisa Formal', 'Pantalón Jean', 'Pantalón Jogger', 'Vestido Floral', 'Vestido Casual', 'Chaqueta Denim', 'Chaqueta Bomber', 'Falda Plisada', 'Short Deportivo', 'Blusa Manga Larga', 'Sudadera con Capucha', 'Casaca Impermeable', 'Enterizo', 'Chompa de Lana', 'Legging Deportivo', 'Bividí', 'Overol'];
const COLORES = ['Negro', 'Blanco', 'Azul Marino', 'Rojo', 'Beige', 'Gris', 'Verde Oliva', 'Celeste', 'Amarillo', 'Rosado', 'Morado', 'Café', 'Turquesa', 'Naranja', 'Vino'];

async function main() {
  const [categorias, marcas, tallas, tiposDocumento, tiposComprobante, mediosPago] = await Promise.all([
    prisma.categoria.findMany(),
    prisma.marca.findMany(),
    prisma.talla.findMany(),
    prisma.tipoDocumento.findMany(),
    prisma.tipoComprobante.findMany(),
    prisma.medioPago.findMany(),
  ]);

  if (!categorias.length || !marcas.length || !tallas.length || !tiposDocumento.length || !tiposComprobante.length || !mediosPago.length) {
    throw new Error('Faltan catálogos base. Ejecuta "npm run seed" antes de este script.');
  }

  const dni = tiposDocumento.find((t) => t.abreviatura === 'DNI') ?? tiposDocumento[0];

  console.log('Creando proveedores...');
  const proveedores: Proveedor[] = [];
  const rucsUsados = new Set<string>();
  for (let i = 0; i < PROVEEDOR_N; i++) {
    proveedores.push(
      await prisma.proveedor.create({
        data: {
          documento: generarRuc(rucsUsados),
          nombre: `${pick(PROVEEDOR_NOMBRES)} ${i + 1} S.A.C.`,
          descripcion: 'Proveedor de insumos y productos textiles',
          correo: `proveedor${i + 1}@textilesperu.com`,
          telefono: `9${randInt(10000000, 99999999)}`,
          ...timestamps(),
        },
      }),
    );
  }
  console.log(`Proveedores creados: ${proveedores.length}`);

  console.log('Creando artículos...');
  const articulos: Articulo[] = [];
  for (let i = 0; i < N; i++) {
    const base = pick(ARTICULOS_BASE);
    articulos.push(
      await prisma.articulo.create({
        data: {
          nombre: `${base.nombre} #${i + 1}`,
          descripcion: `Insumo de tipo ${base.nombre.toLowerCase()} para confección`,
          cantidad: randInt(50, 2000) / 10,
          precio: round2(randInt(150, 4000) / 100),
          unidad: base.unidad,
          ...timestamps(),
        },
      }),
    );
  }
  console.log(`Artículos creados: ${articulos.length}`);

  console.log('Creando clientes con direcciones...');
  const clientes: (Cliente & { direcciones: Direccion[] })[] = [];
  const dnisUsados = new Set<string>();
  for (let i = 0; i < CLIENTE_N; i++) {
    const { createdAt, updatedAt } = timestamps();
    const distrito = pick(DISTRITOS);
    const cliente = await prisma.cliente.create({
      data: {
        tipoDocumentoId: dni.id,
        documento: generarDni(dnisUsados),
        nombre: pick(NOMBRES),
        apellido: pick(APELLIDOS),
        correo: `cliente${i + 1}@gmail.com`,
        telefono: `9${randInt(10000000, 99999999)}`,
        createdAt,
        updatedAt,
        direcciones: {
          create: [
            {
              alias: 'Casa',
              direccion: `Av. ${pick(APELLIDOS)} ${randInt(100, 2500)}`,
              distrito,
              provincia: 'Lima',
              departamento: 'Lima',
              referencia: 'Cerca al parque principal',
              esPrincipal: true,
              createdAt,
              updatedAt,
            },
          ],
        },
      },
      include: { direcciones: true },
    });
    clientes.push(cliente);
  }
  console.log(`Clientes creados: ${clientes.length} (con 1 dirección cada uno = ${clientes.length} direcciones)`);

  console.log('Creando productos con variante de color...');
  const productos: (Producto & { colores: Color[] })[] = [];
  const colorPorProducto = new Map<number, { id: number }>();
  for (let i = 0; i < N; i++) {
    const { createdAt, updatedAt } = timestamps();
    const producto = await prisma.producto.create({
      data: {
        nombre: `${pick(PRODUCTO_BASE)} ${i + 1}`,
        descripcion: 'Prenda textil de producción propia',
        precio: round2(randInt(3000, 25000) / 100),
        categoriaId: pick(categorias).id,
        marcaId: pick(marcas).id,
        sku: `SKU-${String(i + 1).padStart(4, '0')}`,
        createdAt,
        updatedAt,
        colores: {
          create: [{ nombre: pick(COLORES), createdAt, updatedAt }],
        },
      },
      include: { colores: true },
    });
    productos.push(producto);
    colorPorProducto.set(producto.id, producto.colores[0]);
  }
  console.log(`Productos creados: ${productos.length} (con ${productos.length} colores)`);

  console.log('Creando inventario...');
  const inventarios: Inventario[] = [];
  for (const producto of productos) {
    // TDS (Disponibilidad de stock) Postest ≈ 95.97% -> ~96% de variantes con stock > 0
    const sinStock = Math.random() < 0.04;
    inventarios.push(
      await prisma.inventario.create({
        data: {
          productoId: producto.id,
          tallaId: pick(tallas).id,
          colorId: colorPorProducto.get(producto.id)!.id,
          stock: sinStock ? 0 : randInt(1, 200),
          stockMinimo: randInt(5, 20),
          precio: producto.precio,
          ...timestamps(),
        },
      }),
    );
  }
  console.log(`Registros de inventario creados: ${inventarios.length}`);

  console.log('Creando movimientos de inventario...');
  // Un movimiento "más reciente" por cada registro de inventario, para que TPRI se pueda
  // medir de forma real: ¿el último movimiento coincide con el stock actual del sistema?
  // TPRI (Precisión de registros de inventario) Postest ≈ 97.97% -> coincide en ~98% de los casos
  for (const inv of inventarios) {
    const tipo = pick([TipoMovimiento.INGRESO, TipoMovimiento.EGRESO, TipoMovimiento.AJUSTE, TipoMovimiento.DEVOLUCION]);
    const preciso = Math.random() < 0.9797;
    const stockDespues = preciso ? inv.stock : Math.max(inv.stock + pick([-1, 1]) * randInt(1, 8), 0);
    const cantidad = randInt(1, 30);
    const stockAntes = tipo === TipoMovimiento.EGRESO ? stockDespues + cantidad : Math.max(stockDespues - cantidad, 0);
    await prisma.movimientoInventario.create({
      data: {
        inventarioId: inv.id,
        tipo,
        cantidad,
        stockAntes,
        stockDespues,
        referencia: `AJUSTE-${inv.id}`,
        notas: 'Movimiento generado como dato de prueba',
        createdAt: randomDate(),
      },
    });
  }
  console.log(`Movimientos de inventario creados: ${inventarios.length}`);

  console.log('Creando cupones...');
  const cupones: Cupon[] = [];
  for (let i = 0; i < N; i++) {
    const tipo = pick([TipoCupon.PORCENTAJE, TipoCupon.VALOR_FIJO]);
    const { createdAt, updatedAt } = timestamps();
    cupones.push(
      await prisma.cupon.create({
        data: {
          codigo: `PROMO${String(i + 1).padStart(3, '0')}`,
          descripcion: 'Cupón de descuento generado para pruebas',
          valor: tipo === TipoCupon.PORCENTAJE ? randInt(5, 40) : round2(randInt(1000, 8000) / 100),
          tipo,
          usosMaximos: randInt(1, 100),
          usosActuales: randInt(0, 5),
          fechaExpiracion: randomDate(createdAt),
          activo: Math.random() < 0.85,
          createdAt,
          updatedAt,
        },
      }),
    );
  }
  console.log(`Cupones creados: ${cupones.length}`);

  console.log('Creando recetas (Producto_Articulo)...');
  for (let i = 0; i < N; i++) {
    await prisma.producto_Articulo.create({
      data: {
        productoId: productos[i].id,
        articuloId: articulos[i].id,
        cantidad: round2(randInt(10, 500) / 100),
        ...timestamps(),
      },
    });
  }
  console.log(`Recetas creadas: ${N}`);

  console.log('Creando compras con detalle...');
  for (let i = 0; i < N; i++) {
    const tipo = i % 2 === 0 ? TipoCompra.PRODUCTO : TipoCompra.ARTICULO;
    // TCOC (Tasa de cumplimiento de OC) Postest ≈ 96.97% -> ~97% VIGENTE / ~3% ANULADO
    const estado = Math.random() < 0.97 ? EstadoCompra.VIGENTE : EstadoCompra.ANULADO;
    // TPOC (Tiempo de generación de OC) Postest ≈ 1.43 días -> brecha createdAt→updatedAt entre 20 y 48h (prom. ~1.4 días)
    const { createdAt, updatedAt } = tightTimestamps(undefined, 20, 48);

    if (tipo === TipoCompra.PRODUCTO) {
      const lineas = Array.from({ length: 2 }, () => {
        const producto = pick(productos);
        const cantidad = randInt(5, 50);
        const precio = Number(producto.precio);
        return {
          productoId: producto.id,
          tallaId: pick(tallas).id,
          colorId: colorPorProducto.get(producto.id)!.id,
          cantidad,
          precio,
          subtotal: round2(cantidad * precio),
          createdAt,
          updatedAt,
        };
      });
      await prisma.compra.create({
        data: {
          tipo,
          estado,
          proveedorId: pick(proveedores).id,
          total: round2(lineas.reduce((sum, l) => sum + l.subtotal, 0)),
          createdAt,
          updatedAt,
          detalles: { create: lineas },
        },
      });
    } else {
      const lineas = Array.from({ length: 2 }, () => {
        const articulo = pick(articulos);
        const cantidad = round2(randInt(50, 3000) / 100);
        const precio = Number(articulo.precio);
        return {
          articuloId: articulo.id,
          cantidad,
          precio,
          subtotal: round2(cantidad * precio),
          createdAt,
          updatedAt,
        };
      });
      await prisma.compra.create({
        data: {
          tipo,
          estado,
          proveedorId: pick(proveedores).id,
          total: round2(lineas.reduce((sum, l) => sum + l.subtotal, 0)),
          createdAt,
          updatedAt,
          detallesArticulo: { create: lineas },
        },
      });
    }
  }
  console.log(`Compras creadas: ${N} (50 tipo PRODUCTO con 100 líneas + 50 tipo ARTICULO con 100 líneas)`);

  console.log('Creando órdenes de producción...');
  for (let i = 0; i < N; i++) {
    const producto = pick(productos);
    // TCOP (Tasa de cumplimiento de OP) Postest ≈ 95.97% -> ~96% COMPLETADO / ~4% no completada (EN_PROCESO o CANCELADO)
    const estado = Math.random() < 0.96 ? EstadoProduccion.COMPLETADO : pick([EstadoProduccion.EN_PROCESO, EstadoProduccion.CANCELADO]);
    const { createdAt, updatedAt } = timestamps();
    const cantidadPlanificada = randInt(10, 200);
    const cantidadProducida =
      estado === EstadoProduccion.COMPLETADO ? cantidadPlanificada : estado === EstadoProduccion.EN_PROCESO ? randInt(1, cantidadPlanificada - 1) : 0;
    const fechaInicio = estado === EstadoProduccion.CANCELADO ? null : randomDate(createdAt);
    // TPOP (Tiempo de procesamiento de OP) Postest ≈ 0.49 horas -> brecha fechaInicio→fechaFin entre 0.2 y 0.8h
    const fechaFin =
      estado === EstadoProduccion.COMPLETADO && fechaInicio
        ? new Date(Math.min(fechaInicio.getTime() + (0.2 + Math.random() * 0.6) * 3_600_000, RANGE_END))
        : null;

    await prisma.ordenProduccion.create({
      data: {
        productoId: producto.id,
        tallaId: pick(tallas).id,
        colorId: colorPorProducto.get(producto.id)!.id,
        cantidadPlanificada,
        cantidadProducida,
        estado,
        observaciones: 'Orden de producción generada como dato de prueba',
        fechaInicio,
        fechaFin,
        createdAt,
        updatedAt,
      },
    });
  }
  console.log(`Órdenes de producción creadas: ${N}`);

  console.log('Creando pedidos con detalle y venta...');
  for (let i = 0; i < N; i++) {
    const cliente = pick(clientes);
    const producto = pick(productos);
    const cupon = Math.random() < 0.4 ? pick(cupones) : null;
    // TPAP (Tiempo de atención de pedidos) Postest ≈ 0.25 horas -> brecha createdAt→updatedAt entre 0.1 y 0.4h
    const { createdAt, updatedAt } = tightTimestamps(undefined, 0.1, 0.4);
    // TCE (Tasa de cumplimiento de entregas) Postest ≈ 95.97% -> ~96% ENTREGADO a tiempo / ~4% EN_CAMINO (retrasado)
    const entregaATiempo = Math.random() < 0.96;
    const estado = entregaATiempo ? EstadoPedido.ENTREGADO : EstadoPedido.EN_CAMINO;
    const fechaEntrega = entregaATiempo
      ? new Date(Math.min(updatedAt.getTime() + randInt(1, 6) * 3_600_000, RANGE_END))
      : new Date(Math.max(updatedAt.getTime() - randInt(1, 12) * 3_600_000, createdAt.getTime()));

    const cantidad = randInt(1, 5);
    const precioUnitario = Number(producto.precio);
    const subtotalLinea = round2(cantidad * precioUnitario);

    const descuentoCupon = cupon
      ? cupon.tipo === TipoCupon.PORCENTAJE
        ? round2(subtotalLinea * (Number(cupon.valor) / 100))
        : Math.min(Number(cupon.valor), subtotalLinea)
      : 0;
    const impuesto = round2((subtotalLinea - descuentoCupon) * 0.18);
    const total = round2(subtotalLinea - descuentoCupon + impuesto);

    const pedido = await prisma.pedido.create({
      data: {
        clienteId: cliente.id,
        cuponId: cupon?.id ?? null,
        medioPagoId: pick(mediosPago).id,
        tipoComprobanteId: pick(tiposComprobante).id,
        subtotal: subtotalLinea,
        impuesto,
        descuento: 0,
        descuentoCupon,
        total,
        origen: pick([OrigenPedido.ERP, OrigenPedido.ECOMMERCE]),
        estado,
        estadoPago: EstadoPago.PAGADO,
        direccionEnvio: `${cliente.direcciones[0].direccion}, ${cliente.direcciones[0].distrito}`,
        fechaEntrega,
        createdAt,
        updatedAt,
        detalles: {
          create: [
            {
              productoId: producto.id,
              tallaId: pick(tallas).id,
              colorId: colorPorProducto.get(producto.id)!.id,
              cantidad,
              precioUnitario,
              descuento: 0,
              subtotal: subtotalLinea,
              createdAt,
              updatedAt,
            },
          ],
        },
      },
    });

    await prisma.venta.create({
      data: {
        pedidoId: pedido.id,
        ...timestamps(pedido.createdAt),
      },
    });
  }
  console.log(`Pedidos creados: ${N} (con ${N} líneas de detalle y ${N} ventas)`);

  console.log('Listo. Todos los datos de prueba se generaron con fechas entre 2026-04-01 y 2026-06-30.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
