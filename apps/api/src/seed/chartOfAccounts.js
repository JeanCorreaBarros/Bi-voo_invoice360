// Plan Único de Cuentas (PUC) colombiano estándar (Decreto 2650 de 1993):
// las 7 clases, sus grupos principales, y las cuentas de nivel 3 más usadas
// de cada grupo. Editable después desde Contabilidad > Plan de Cuentas.
//
// `parentCode: null` = clase (nivel 1). Clases/grupos no reciben movimientos
// directos (allowsEntries: false); las cuentas de nivel 3 sí.
const PUC = [
  // ══════════════════ CLASE 1: ACTIVO ══════════════════
  { code: '1', name: 'ACTIVO', type: 'ASSET', nature: 'DEBIT', level: 1, parentCode: null, allowsEntries: false },

  { code: '11', name: 'Disponible', type: 'ASSET', nature: 'DEBIT', level: 2, parentCode: '1', allowsEntries: false },
  { code: '110505', name: 'Caja General', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '11', allowsEntries: true },
  { code: '110510', name: 'Cajas Menores', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '11', allowsEntries: true },
  { code: '111005', name: 'Bancos Nacionales', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '11', allowsEntries: true },
  { code: '111010', name: 'Bancos Moneda Extranjera', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '11', allowsEntries: true },
  { code: '112005', name: 'Cuentas de Ahorro', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '11', allowsEntries: true },

  { code: '12', name: 'Inversiones', type: 'ASSET', nature: 'DEBIT', level: 2, parentCode: '1', allowsEntries: false },
  { code: '120405', name: 'Acciones', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '12', allowsEntries: true },
  { code: '120805', name: 'Cuotas o Partes de Interés Social', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '12', allowsEntries: true },
  { code: '121005', name: 'Certificados de Depósito a Término (CDT)', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '12', allowsEntries: true },

  { code: '13', name: 'Deudores', type: 'ASSET', nature: 'DEBIT', level: 2, parentCode: '1', allowsEntries: false },
  { code: '130505', name: 'Clientes Nacionales', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '13', allowsEntries: true },
  { code: '130510', name: 'Clientes del Exterior', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '13', allowsEntries: true },
  { code: '133505', name: 'Anticipos y Avances', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '13', allowsEntries: true },
  { code: '135515', name: 'Anticipo de Impuestos - Retención en la Fuente', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '13', allowsEntries: true },
  { code: '135520', name: 'Anticipo de Impuestos - Industria y Comercio', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '13', allowsEntries: true },
  { code: '136505', name: 'Cuentas por Cobrar a Trabajadores', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '13', allowsEntries: true },
  { code: '138030', name: 'Depósitos Entregados en Garantía', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '13', allowsEntries: true },
  { code: '139905', name: 'Deudas de Difícil Cobro', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '13', allowsEntries: true },

  { code: '14', name: 'Inventarios', type: 'ASSET', nature: 'DEBIT', level: 2, parentCode: '1', allowsEntries: false },
  { code: '140405', name: 'Materias Primas', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '14', allowsEntries: true },
  { code: '143005', name: 'Productos Terminados', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '14', allowsEntries: true },
  { code: '143505', name: 'Inventario de Mercancías', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '14', allowsEntries: true },
  { code: '145505', name: 'Envases y Empaques', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '14', allowsEntries: true },
  { code: '148005', name: 'Inventarios en Tránsito', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '14', allowsEntries: true },

  { code: '15', name: 'Propiedades, Planta y Equipo', type: 'ASSET', nature: 'DEBIT', level: 2, parentCode: '1', allowsEntries: false },
  { code: '150405', name: 'Terrenos', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '15', allowsEntries: true },
  { code: '151605', name: 'Construcciones y Edificaciones', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '15', allowsEntries: true },
  { code: '152405', name: 'Equipo de Oficina', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '15', allowsEntries: true },
  { code: '152805', name: 'Equipo de Computación y Comunicación', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '15', allowsEntries: true },
  { code: '154005', name: 'Flota y Equipo de Transporte', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '15', allowsEntries: true },
  { code: '156005', name: 'Maquinaria y Equipo', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '15', allowsEntries: true },
  { code: '159205', name: 'Depreciación Acumulada', type: 'ASSET', nature: 'CREDIT', level: 3, parentCode: '15', allowsEntries: true },

  { code: '16', name: 'Intangibles', type: 'ASSET', nature: 'DEBIT', level: 2, parentCode: '1', allowsEntries: false },
  { code: '160505', name: 'Crédito Mercantil', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '16', allowsEntries: true },
  { code: '162005', name: 'Licencias', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '16', allowsEntries: true },
  { code: '163505', name: 'Software', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '16', allowsEntries: true },

  { code: '17', name: 'Diferidos', type: 'ASSET', nature: 'DEBIT', level: 2, parentCode: '1', allowsEntries: false },
  { code: '170505', name: 'Gastos Pagados por Anticipado', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '17', allowsEntries: true },
  { code: '173505', name: 'Cargos Diferidos', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '17', allowsEntries: true },

  { code: '18', name: 'Otros Activos', type: 'ASSET', nature: 'DEBIT', level: 2, parentCode: '1', allowsEntries: false },
  { code: '180505', name: 'Bienes de Arte y Cultura', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '18', allowsEntries: true },

  { code: '19', name: 'Valorizaciones', type: 'ASSET', nature: 'DEBIT', level: 2, parentCode: '1', allowsEntries: false },
  { code: '190405', name: 'De Inversiones', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '19', allowsEntries: true },
  { code: '192005', name: 'De Propiedades, Planta y Equipo', type: 'ASSET', nature: 'DEBIT', level: 3, parentCode: '19', allowsEntries: true },

  // ══════════════════ CLASE 2: PASIVO ══════════════════
  { code: '2', name: 'PASIVO', type: 'LIABILITY', nature: 'CREDIT', level: 1, parentCode: null, allowsEntries: false },

  { code: '21', name: 'Obligaciones Financieras', type: 'LIABILITY', nature: 'CREDIT', level: 2, parentCode: '2', allowsEntries: false },
  { code: '210505', name: 'Bancos Nacionales', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '21', allowsEntries: true },
  { code: '211005', name: 'Otras Obligaciones', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '21', allowsEntries: true },

  { code: '22', name: 'Proveedores', type: 'LIABILITY', nature: 'CREDIT', level: 2, parentCode: '2', allowsEntries: false },
  { code: '220505', name: 'Proveedores Nacionales', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '22', allowsEntries: true },
  { code: '220510', name: 'Proveedores del Exterior', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '22', allowsEntries: true },

  { code: '23', name: 'Cuentas por Pagar', type: 'LIABILITY', nature: 'CREDIT', level: 2, parentCode: '2', allowsEntries: false },
  { code: '233595', name: 'Cuentas por Pagar Varias', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '23', allowsEntries: true },
  { code: '236005', name: 'Costos y Gastos por Pagar', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '23', allowsEntries: true },
  { code: '237006', name: 'Retención y Aportes de Nómina', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '23', allowsEntries: true },

  { code: '24', name: 'Impuestos, Gravámenes y Tasas', type: 'LIABILITY', nature: 'CREDIT', level: 2, parentCode: '2', allowsEntries: false },
  { code: '240801', name: 'Retención en la Fuente', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '24', allowsEntries: true },
  { code: '240810', name: 'Impuesto a las Ventas por Pagar (IVA)', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '24', allowsEntries: true },
  { code: '240815', name: 'Impuesto de Industria y Comercio', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '24', allowsEntries: true },
  { code: '247005', name: 'De Renta y Complementarios', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '24', allowsEntries: true },

  { code: '25', name: 'Obligaciones Laborales', type: 'LIABILITY', nature: 'CREDIT', level: 2, parentCode: '2', allowsEntries: false },
  { code: '250505', name: 'Salarios por Pagar', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '25', allowsEntries: true },
  { code: '251005', name: 'Cesantías Consolidadas', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '25', allowsEntries: true },
  { code: '251505', name: 'Intereses sobre Cesantías', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '25', allowsEntries: true },
  { code: '252005', name: 'Prima de Servicios', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '25', allowsEntries: true },
  { code: '253005', name: 'Vacaciones Consolidadas', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '25', allowsEntries: true },

  { code: '26', name: 'Pasivos Estimados y Provisiones', type: 'LIABILITY', nature: 'CREDIT', level: 2, parentCode: '2', allowsEntries: false },
  { code: '261005', name: 'Para Obligaciones Laborales', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '26', allowsEntries: true },
  { code: '268005', name: 'Provisión para Contingencias', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '26', allowsEntries: true },

  { code: '27', name: 'Diferidos', type: 'LIABILITY', nature: 'CREDIT', level: 2, parentCode: '2', allowsEntries: false },
  { code: '272005', name: 'Ingresos Recibidos para Terceros', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '27', allowsEntries: true },

  { code: '28', name: 'Otros Pasivos', type: 'LIABILITY', nature: 'CREDIT', level: 2, parentCode: '2', allowsEntries: false },
  { code: '280505', name: 'Anticipos y Avances Recibidos', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '28', allowsEntries: true },
  { code: '282005', name: 'Depósitos Recibidos', type: 'LIABILITY', nature: 'CREDIT', level: 3, parentCode: '28', allowsEntries: true },

  // ══════════════════ CLASE 3: PATRIMONIO ══════════════════
  { code: '3', name: 'PATRIMONIO', type: 'EQUITY', nature: 'CREDIT', level: 1, parentCode: null, allowsEntries: false },

  { code: '31', name: 'Capital Social', type: 'EQUITY', nature: 'CREDIT', level: 2, parentCode: '3', allowsEntries: false },
  { code: '310505', name: 'Capital Suscrito y Pagado', type: 'EQUITY', nature: 'CREDIT', level: 3, parentCode: '31', allowsEntries: true },

  { code: '32', name: 'Superávit de Capital', type: 'EQUITY', nature: 'CREDIT', level: 2, parentCode: '3', allowsEntries: false },
  { code: '320505', name: 'Prima en Colocación de Acciones', type: 'EQUITY', nature: 'CREDIT', level: 3, parentCode: '32', allowsEntries: true },

  { code: '33', name: 'Reservas', type: 'EQUITY', nature: 'CREDIT', level: 2, parentCode: '3', allowsEntries: false },
  { code: '330505', name: 'Reserva Legal', type: 'EQUITY', nature: 'CREDIT', level: 3, parentCode: '33', allowsEntries: true },

  { code: '36', name: 'Resultados del Ejercicio', type: 'EQUITY', nature: 'CREDIT', level: 2, parentCode: '3', allowsEntries: false },
  { code: '360505', name: 'Utilidad del Ejercicio', type: 'EQUITY', nature: 'CREDIT', level: 3, parentCode: '36', allowsEntries: true },
  { code: '360805', name: 'Pérdida del Ejercicio', type: 'EQUITY', nature: 'DEBIT', level: 3, parentCode: '36', allowsEntries: true },

  { code: '37', name: 'Resultados de Ejercicios Anteriores', type: 'EQUITY', nature: 'CREDIT', level: 2, parentCode: '3', allowsEntries: false },
  { code: '370505', name: 'Utilidades Acumuladas', type: 'EQUITY', nature: 'CREDIT', level: 3, parentCode: '37', allowsEntries: true },
  { code: '370805', name: 'Pérdidas Acumuladas', type: 'EQUITY', nature: 'DEBIT', level: 3, parentCode: '37', allowsEntries: true },

  // ══════════════════ CLASE 4: INGRESOS ══════════════════
  { code: '4', name: 'INGRESOS', type: 'INCOME', nature: 'CREDIT', level: 1, parentCode: null, allowsEntries: false },

  { code: '41', name: 'Operacionales', type: 'INCOME', nature: 'CREDIT', level: 2, parentCode: '4', allowsEntries: false },
  { code: '413595', name: 'Comercio al por Mayor y al por Menor', type: 'INCOME', nature: 'CREDIT', level: 3, parentCode: '41', allowsEntries: true },
  { code: '417005', name: 'Actividades de Servicios', type: 'INCOME', nature: 'CREDIT', level: 3, parentCode: '41', allowsEntries: true },

  { code: '42', name: 'No Operacionales', type: 'INCOME', nature: 'CREDIT', level: 2, parentCode: '4', allowsEntries: false },
  { code: '421005', name: 'Financieros', type: 'INCOME', nature: 'CREDIT', level: 3, parentCode: '42', allowsEntries: true },
  { code: '424805', name: 'Indemnizaciones', type: 'INCOME', nature: 'CREDIT', level: 3, parentCode: '42', allowsEntries: true },
  { code: '425095', name: 'Ingresos Diversos', type: 'INCOME', nature: 'CREDIT', level: 3, parentCode: '42', allowsEntries: true },

  // ══════════════════ CLASE 5: GASTOS ══════════════════
  { code: '5', name: 'GASTOS', type: 'EXPENSE', nature: 'DEBIT', level: 1, parentCode: null, allowsEntries: false },

  { code: '51', name: 'Operacionales de Administración', type: 'EXPENSE', nature: 'DEBIT', level: 2, parentCode: '5', allowsEntries: false },
  { code: '510506', name: 'Sueldos - Administración', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '51', allowsEntries: true },
  { code: '510530', name: 'Horas Extras y Recargos', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '51', allowsEntries: true },
  { code: '511006', name: 'Aportes a EPS', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '51', allowsEntries: true },
  { code: '512006', name: 'Aportes a Fondos de Pensiones y Cesantías', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '51', allowsEntries: true },
  { code: '513506', name: 'Arrendamientos', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '51', allowsEntries: true },
  { code: '514006', name: 'Contribuciones y Afiliaciones', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '51', allowsEntries: true },
  { code: '515206', name: 'Depreciación de Propiedades, Planta y Equipo', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '51', allowsEntries: true },
  { code: '516006', name: 'Diversos', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '51', allowsEntries: true },
  { code: '519506', name: 'Gastos de Viaje', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '51', allowsEntries: true },
  { code: '519515', name: 'Elementos de Aseo y Cafetería', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '51', allowsEntries: true },
  { code: '519525', name: 'Servicios Públicos', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '51', allowsEntries: true },

  { code: '52', name: 'Operacionales de Ventas', type: 'EXPENSE', nature: 'DEBIT', level: 2, parentCode: '5', allowsEntries: false },
  { code: '520506', name: 'Sueldos - Ventas', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '52', allowsEntries: true },
  { code: '521006', name: 'Aportes a EPS', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '52', allowsEntries: true },
  { code: '523506', name: 'Arrendamientos', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '52', allowsEntries: true },
  { code: '524506', name: 'Comisiones', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '52', allowsEntries: true },
  { code: '529506', name: 'Gastos de Viaje', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '52', allowsEntries: true },
  { code: '529510', name: 'Publicidad y Propaganda', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '52', allowsEntries: true },
  { code: '529515', name: 'Empaques y Envases', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '52', allowsEntries: true },

  { code: '53', name: 'No Operacionales', type: 'EXPENSE', nature: 'DEBIT', level: 2, parentCode: '5', allowsEntries: false },
  { code: '530505', name: 'Gastos Bancarios', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '53', allowsEntries: true },
  { code: '530515', name: 'Intereses', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '53', allowsEntries: true },
  { code: '536005', name: 'Impuestos Asumidos', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '53', allowsEntries: true },

  { code: '54', name: 'Impuesto de Renta y Complementarios', type: 'EXPENSE', nature: 'DEBIT', level: 2, parentCode: '5', allowsEntries: false },
  { code: '540505', name: 'Impuesto de Renta y Complementarios', type: 'EXPENSE', nature: 'DEBIT', level: 3, parentCode: '54', allowsEntries: true },

  // ══════════════════ CLASE 6: COSTO DE VENTAS ══════════════════
  { code: '6', name: 'COSTO DE VENTAS', type: 'COST', nature: 'DEBIT', level: 1, parentCode: null, allowsEntries: false },

  { code: '61', name: 'Costo de Ventas y de Prestación de Servicios', type: 'COST', nature: 'DEBIT', level: 2, parentCode: '6', allowsEntries: false },
  { code: '613505', name: 'Costo de Mercancía Vendida', type: 'COST', nature: 'DEBIT', level: 3, parentCode: '61', allowsEntries: true },
  { code: '614005', name: 'Costo de lo Vendido en Servicios', type: 'COST', nature: 'DEBIT', level: 3, parentCode: '61', allowsEntries: true },

  { code: '62', name: 'Compras', type: 'COST', nature: 'DEBIT', level: 2, parentCode: '6', allowsEntries: false },
  { code: '620505', name: 'Materias Primas', type: 'COST', nature: 'DEBIT', level: 3, parentCode: '62', allowsEntries: true },
  { code: '623505', name: 'Mercancías', type: 'COST', nature: 'DEBIT', level: 3, parentCode: '62', allowsEntries: true },

  // ══════════════════ CLASE 7: COSTOS DE PRODUCCIÓN ══════════════════
  { code: '7', name: 'COSTOS DE PRODUCCIÓN O DE OPERACIÓN', type: 'COST', nature: 'DEBIT', level: 1, parentCode: null, allowsEntries: false },

  { code: '71', name: 'Materia Prima', type: 'COST', nature: 'DEBIT', level: 2, parentCode: '7', allowsEntries: false },
  { code: '710506', name: 'Materia Prima', type: 'COST', nature: 'DEBIT', level: 3, parentCode: '71', allowsEntries: true },

  { code: '72', name: 'Mano de Obra Directa', type: 'COST', nature: 'DEBIT', level: 2, parentCode: '7', allowsEntries: false },
  { code: '720506', name: 'Sueldos', type: 'COST', nature: 'DEBIT', level: 3, parentCode: '72', allowsEntries: true },

  { code: '73', name: 'Costos Indirectos', type: 'COST', nature: 'DEBIT', level: 2, parentCode: '7', allowsEntries: false },
  { code: '730506', name: 'Mano de Obra Indirecta', type: 'COST', nature: 'DEBIT', level: 3, parentCode: '73', allowsEntries: true },
  { code: '731006', name: 'Materiales Indirectos', type: 'COST', nature: 'DEBIT', level: 3, parentCode: '73', allowsEntries: true },
  { code: '734595', name: 'Depreciaciones', type: 'COST', nature: 'DEBIT', level: 3, parentCode: '73', allowsEntries: true },
]

// Idempotente (upsert por code): segura de correr varias veces, incluso
// contra empresas que ya tienen cuentas creadas/editadas manualmente. Los
// códigos nuevos se agregan; los que ya existen no se tocan (para no pisar
// ediciones manuales que haya hecho la empresa desde Plan de Cuentas).
export async function seedChartOfAccounts(tenantDb) {
  const idByCode = new Map()

  for (const account of PUC) {
    const parentId = account.parentCode ? idByCode.get(account.parentCode) : null

    const saved = await tenantDb.account.upsert({
      where: { code: account.code },
      update: {},
      create: {
        code: account.code,
        name: account.name,
        type: account.type,
        nature: account.nature,
        level: account.level,
        allowsEntries: account.allowsEntries,
        parentId
      }
    })

    idByCode.set(account.code, saved.id)
  }
}
