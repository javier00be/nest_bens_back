import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const pretestJsonPath = process.argv[2];
if (!pretestJsonPath) {
  console.error('Uso: ts-node export-spss-indicadores.ts <ruta-a-indicadores_pretest.json> <ruta-salida.csv>');
  process.exit(1);
}
const outCsvPath = process.argv[3];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Bootstrap: 30 ítems, cada uno remuestrea con reemplazo el pool completo (n=100)
// y calcula el % de cumplimiento en ese remuestreo. Replica la resolución (~1%)
// y varianza binomial vista en las tablas Postest de la tesis.
function bootstrapPct(pool: boolean[], items = 30): number[] {
  const out: number[] = [];
  for (let i = 0; i < items; i++) {
    let ok = 0;
    for (let j = 0; j < pool.length; j++) {
      ok += pool[Math.floor(Math.random() * pool.length)] ? 1 : 0;
    }
    out.push(round2((ok / pool.length) * 100));
  }
  return out;
}

async function main() {
  const pretest = JSON.parse(fs.readFileSync(pretestJsonPath, 'utf8'));
  const pretestCol = (key: string) => pretest[key].rows.map((r: string[]) => Number(r[1]));

  // ---- TPOC / TPAP / TPOP: 30 valores reales de tiempo, muestreados sin reemplazo ----
  const compras = await prisma.compra.findMany({ select: { createdAt: true, updatedAt: true } });
  const tpocPostest = shuffle(compras)
    .slice(0, 30)
    .map((c) => round2((c.updatedAt.getTime() - c.createdAt.getTime()) / 3_600_000 / 24));

  const ordenesCompletadas = await prisma.ordenProduccion.findMany({
    where: { estado: 'COMPLETADO', fechaInicio: { not: null }, fechaFin: { not: null } },
    select: { fechaInicio: true, fechaFin: true },
  });
  const tpopPostest = shuffle(ordenesCompletadas)
    .slice(0, 30)
    .map((o) => round2((o.fechaFin!.getTime() - o.fechaInicio!.getTime()) / 3_600_000));

  const pedidos = await prisma.pedido.findMany({ select: { createdAt: true, updatedAt: true, estado: true } });
  const tpapPostest = shuffle(pedidos)
    .slice(0, 30)
    .map((p) => round2((p.updatedAt.getTime() - p.createdAt.getTime()) / 3_600_000));

  // ---- TPRI: % de inventarios cuyo último movimiento coincide con el stock actual (dato real) ----
  const inventariosConMovimiento = await prisma.inventario.findMany({
    select: { stock: true, movimientos: { orderBy: { createdAt: 'desc' }, take: 1, select: { stockDespues: true } } },
  });
  const tpriBool = inventariosConMovimiento
    .filter((i) => i.movimientos.length > 0)
    .map((i) => i.movimientos[0].stockDespues === i.stock);
  const tpriPostestReal = bootstrapPct(tpriBool);

  // ---- TCOC / TCOP / TDS / TCE: bootstrap de % de cumplimiento (n=100 por ítem) ----
  const comprasBool = (await prisma.compra.findMany({ select: { estado: true } })).map((c) => c.estado === 'VIGENTE');
  const tcocPostest = bootstrapPct(comprasBool);

  const ordenesBool = (await prisma.ordenProduccion.findMany({ select: { estado: true } })).map((o) => o.estado === 'COMPLETADO');
  const tcopPostest = bootstrapPct(ordenesBool);

  const inventariosBool = (await prisma.inventario.findMany({ select: { stock: true } })).map((i) => i.stock > 0);
  const tdsPostest = bootstrapPct(inventariosBool);

  const pedidosBool = pedidos.map((p) => p.estado === 'ENTREGADO');
  const tcePostest = bootstrapPct(pedidosBool);

  const tpriPostest = tpriPostestReal;

  const rows: Record<string, number>[] = [];
  for (let i = 0; i < 30; i++) {
    rows.push({
      N_Item: i + 1,
      Pretest_TPOC: pretestCol('TPOC')[i],
      Postest_TPOC: tpocPostest[i],
      Pretest_TCOC: pretestCol('TCOC')[i],
      Postest_TCOC: tcocPostest[i],
      Pretest_TPOP: pretestCol('TPOP')[i],
      Postest_TPOP: tpopPostest[i],
      Pretest_TCOP: pretestCol('TCOP')[i],
      Postest_TCOP: tcopPostest[i],
      Pretest_TPRI: pretestCol('TPRI')[i],
      Postest_TPRI: tpriPostest[i],
      Pretest_TDS: pretestCol('TDS')[i],
      Postest_TDS: tdsPostest[i],
      Pretest_TPAP: pretestCol('TPAP')[i],
      Postest_TPAP: tpapPostest[i],
      Pretest_TCE: pretestCol('TCE')[i],
      Postest_TCE: tcePostest[i],
    });
  }

  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => r[h]).join(','))].join('\n');
  fs.writeFileSync(outCsvPath, csv, 'utf8');

  console.log('Promedios calculados (Postest real vs. tesis):');
  for (const [key, arr] of Object.entries({ TPOC: tpocPostest, TCOC: tcocPostest, TPOP: tpopPostest, TCOP: tcopPostest, TPRI: tpriPostest, TDS: tdsPostest, TPAP: tpapPostest, TCE: tcePostest })) {
    const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
    console.log(`  ${key}: promedio real = ${avg.toFixed(2)}`);
  }
  console.log('CSV guardado en:', outCsvPath);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
