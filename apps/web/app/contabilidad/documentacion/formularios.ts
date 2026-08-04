// Catálogo de formularios DIAN, liquidadores y formatos de cámara de
// comercio publicados por GH Revisores (https://ghrevisores.com).
//
// Se enlaza al archivo en su fuente original en vez de alojar copias: los
// formularios cambian de año gravable y allá se mantienen actualizados,
// así que una copia nuestra quedaría desactualizada en silencio.

export type DocFormat = "xlsx" | "xls" | "docx" | "pdf"

export type DocCategory = "formularios" | "liquidadores" | "formatos"

export type DocItem = {
  code?: string
  title: string
  description?: string
  url: string
  format: DocFormat
  category: DocCategory
}

export const DOC_SOURCE = {
  name: "GH Revisores",
  url: "https://ghrevisores.com/formularios-y-liquidadores/",
}

export const CATEGORY_LABELS: Record<DocCategory, { label: string; hint: string }> = {
  formularios: {
    label: "Formularios DIAN",
    hint: "Declaraciones oficiales en Excel, listas para diligenciar",
  },
  liquidadores: {
    label: "Liquidadores",
    hint: "Hojas de cálculo para liquidar nómina, retenciones e intereses",
  },
  formatos: {
    label: "Formatos y modelos",
    hint: "Certificados, cartas y formularios RUES / cámara de comercio",
  },
}

export const DOCUMENTS: DocItem[] = [
  // ── Formularios DIAN ──
  { code: "110", title: "Declaración de Renta Personas Jurídicas", description: "Renta y complementarios para empresas", url: "https://ghrevisores.com/wp-content/uploads/2025/07/110-Declaracion-de-renta-personas-juridicas.xlsx", format: "xlsx", category: "formularios" },
  { code: "120", title: "Declaración Informativa Precios de Transferencia", description: "Hoja principal", url: "https://ghrevisores.com/wp-content/uploads/2025/07/120-DECLARACION-INFORMATIVA-PRECIOS-DE-TRANSFERENCIA-HOJA-PRINCIPAL.xlsx", format: "xlsx", category: "formularios" },
  { code: "150", title: "Renta por Cambio de Titularidad de Inversión Extranjera", url: "https://ghrevisores.com/wp-content/uploads/2025/07/150-Declaracion-de-renta-por-Cambio-de-la-Titularidad-de-la-Inversion-Extranjera-2024.xls", format: "xls", category: "formularios" },
  { code: "160", title: "Declaración Anual de Activos en el Exterior", url: "https://ghrevisores.com/wp-content/uploads/2025/07/160-DECLARACION-ANUAL-DE-ACTIVOS-EN-EL-EXTERIOR-1.xls", format: "xls", category: "formularios" },
  { code: "210", title: "Renta Personas Naturales y Asimiladas", description: "No obligadas a llevar contabilidad", url: "https://ghrevisores.com/wp-content/uploads/2025/07/210-Declaracion-de-renta-y-complementarios-Personas-Naturales-y-asimiladas-1.xlsx", format: "xlsx", category: "formularios" },
  { code: "220", title: "Certificado de Ingresos y Retenciones", description: "Año gravable 2025", url: "https://ghrevisores.com/wp-content/uploads/2025/07/220-Certificado-de-Ingresos-y-Retenciones-2025.xlsx", format: "xlsx", category: "formularios" },
  { code: "220", title: "Certificado de Ingresos y Retenciones (PDF)", description: "Año gravable 2023", url: "https://ghrevisores.com/wp-content/uploads/2024/02/FORMULARIO-220-ANO-GRAVABLE-2023.pdf", format: "pdf", category: "formularios" },
  { code: "260", title: "Declaración Anual Consolidada Régimen Simple", url: "https://ghrevisores.com/wp-content/uploads/2025/07/260-Declaracion-Anual-Consolidada-Regimen-Sim.xlsx", format: "xlsx", category: "formularios" },
  { code: "300", title: "Declaración de IVA", description: "Impuesto sobre las ventas — el reporte que reemplaza la hoja de Relación de IVA", url: "https://ghrevisores.com/wp-content/uploads/2025/07/300-IVA-2025.xlsx", format: "xlsx", category: "formularios" },
  { code: "310", title: "Impuesto Nacional al Consumo", url: "https://ghrevisores.com/wp-content/uploads/2025/07/310-IMPUESTO-AL-CONSUMO-2025.xls", format: "xls", category: "formularios" },
  { code: "330", title: "Impuesto Nacional sobre Productos Plásticos", url: "https://ghrevisores.com/wp-content/uploads/2025/07/330_Declaracion_impuesto_nacional_sobre_productos_plasticos_.xlsx", format: "xlsx", category: "formularios" },
  { code: "335", title: "Impuesto a Bebidas Ultraprocesadas Azucaradas", url: "https://ghrevisores.com/wp-content/uploads/2025/07/335_Declaracion_impuesto_a_las_bebidas_ultraprocesadas_azucaradas.xlsx", format: "xlsx", category: "formularios" },
  { code: "340", title: "Impuesto a Comestibles Ultraprocesados Industrialmente", url: "https://ghrevisores.com/wp-content/uploads/2025/07/340_impuesto-a-los-producto-comestibles-ultraprocesados-industrilamente_.xlsx", format: "xlsx", category: "formularios" },
  { code: "350", title: "Declaración de Retención en la Fuente", description: "RETEFUENTE mensual", url: "https://ghrevisores.com/wp-content/uploads/2025/07/350-RETENCION-EN-LA-FUENTE-2025-B.xlsx", format: "xlsx", category: "formularios" },
  { code: "410", title: "Gravamen a los Movimientos Financieros (GMF)", url: "https://ghrevisores.com/wp-content/uploads/2025/07/410-GMF-2025.xlsx", format: "xlsx", category: "formularios" },
  { code: "420", title: "Declaración Impuesto al Patrimonio", url: "https://ghrevisores.com/wp-content/uploads/2025/07/420_Declaracion_impuesto_al_patrimonio.xlsx", format: "xlsx", category: "formularios" },
  { code: "430", title: "Impuesto Nacional a la Gasolina y ACPM", url: "https://ghrevisores.com/wp-content/uploads/2025/07/430_Declaracion_impuesto_nacional_gasolina_acpm.xlsx", format: "xlsx", category: "formularios" },
  { code: "435", title: "Declaración Impuesto al Carbono", url: "https://ghrevisores.com/wp-content/uploads/2025/07/435_Impuesto-al-carbono.xlsx", format: "xlsx", category: "formularios" },
  { code: "505", title: "Impuesto Importación de Bebidas Ultraprocesadas Azucaradas", url: "https://ghrevisores.com/wp-content/uploads/2025/07/505_imp_importacion-de-bebidas-ultraprocesadas-azucaradas.xlsx", format: "xlsx", category: "formularios" },
  { code: "532", title: "Declaración de Ingreso/Salida de Dinero", url: "https://ghrevisores.com/wp-content/uploads/2025/07/532-Declaracion-de-Ingreso-Salida-de-dinero-2025.xlsx", format: "xlsx", category: "formularios" },
  { code: "2593", title: "Recibo Electrónico Simple", description: "Régimen simple de tributación", url: "https://ghrevisores.com/wp-content/uploads/2025/07/SI-2593-Recibo-electronico-simple.xlsx", format: "xlsx", category: "formularios" },
  { title: "Resolución 000035 de 2023 — Impuesto al Carbono", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Resolucion-000035-de-07-03-2023-Impuesto-al-carbono.xlsx", format: "xlsx", category: "formularios" },

  // ── Liquidadores ──
  { title: "Liquidación de Contrato Laboral", description: "Cesantías, primas, vacaciones e indemnización", url: "https://ghrevisores.com/wp-content/uploads/2024/02/LIQUIDACION-CONTRATO-LABORAL.xlsx", format: "xlsx", category: "liquidadores" },
  { title: "Costo Total de un Empleado", description: "Salario, prestaciones y aportes patronales", url: "https://ghrevisores.com/wp-content/uploads/2024/02/COSTO-DE-UN-EMPLEADO-ANO-2024.xlsx", format: "xlsx", category: "liquidadores" },
  { title: "Recargos y Horas Extras", description: "Nocturnas, dominicales y festivas", url: "https://ghrevisores.com/wp-content/uploads/2024/02/LIQUIDACION-RECARGOS-Y-HORAS-EXTRAS.xlsx", format: "xlsx", category: "liquidadores" },
  { title: "Intereses Moratorios DIAN", description: "Liquidador de intereses de mora", url: "https://ghrevisores.com/wp-content/uploads/2024/03/Liquidador-Intereses-de-mora-DIAN-2024-Marzo.xls", format: "xls", category: "liquidadores" },
  { title: "Tabla de Retención en la Fuente", description: "Conceptos, bases y tarifas vigentes", url: "https://ghrevisores.com/wp-content/uploads/2024/02/TABLA-DE-RETENCION-EN-LA-FUENTE-ANO-2024.xlsx", format: "xlsx", category: "liquidadores" },
  { title: "Retención en la Fuente — Procedimiento 1", url: "https://ghrevisores.com/wp-content/uploads/2024/02/RTE-FTE-PROCEDIMIENTO-1-2024.xlsx", format: "xlsx", category: "liquidadores" },
  { title: "Retención en la Fuente — Procedimiento 2", url: "https://ghrevisores.com/wp-content/uploads/2024/02/RTE-FTE-PROCEDIMIENTO-2-2024.xlsx", format: "xlsx", category: "liquidadores" },
  { title: "Calendario Tributario", description: "Vencimientos del año por tipo de contribuyente", url: "https://ghrevisores.com/wp-content/uploads/2024/02/Calendario-Tributario-2024-GH.xlsx", format: "xlsx", category: "liquidadores" },
  { title: "Formatos de Información Exógena", description: "Formatos nacionales por año gravable", url: "https://ghrevisores.com/wp-content/uploads/2021/04/FORMATOS-EXOGENA-AG-2020.xls", format: "xls", category: "liquidadores" },

  // ── Formatos y modelos ──
  { title: "Modelo Certificado de Retención — Empleado", url: "https://ghrevisores.com/wp-content/uploads/2023/05/MODELO-CERTIFICADO-RETENCION-EN-LA-FUENTE-EMPLEADO-.docx", format: "docx", category: "formatos" },
  { title: "Modelo Certificado de Retención — Trabajador Independiente", url: "https://ghrevisores.com/wp-content/uploads/2023/05/MODELO-CERTIFICADO-RETENCION-EN-LA-FUENTE-TRABAJADOR-INDEPENDIENTE-.docx", format: "docx", category: "formatos" },
  { title: "Modelo Certificación de Impuestos", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Certificacion-de-impuestos.docx", format: "docx", category: "formatos" },
  { title: "Modelo Carta Régimen Simple", url: "https://ghrevisores.com/wp-content/uploads/2023/05/CARTA-Regimen-Simple-.docx", format: "docx", category: "formatos" },
  { title: "Modelo Composición Accionaria", url: "https://ghrevisores.com/wp-content/uploads/2023/05/COMPOSICION-ACCIONARIA.docx", format: "docx", category: "formatos" },
  { title: "Registro Único de Proponente (RUP) — Anexo 2", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Anexo_2_-RUP_Camara_Comercio_U2857_2.pdf", format: "pdf", category: "formatos" },
  { title: "Entidades de Economía Solidaria y ESALES — Formato RUES", url: "https://ghrevisores.com/wp-content/uploads/2023/05/anexo5_entidades_economiasolidaria_yesales.pdf", format: "pdf", category: "formatos" },
  { title: "Cancelación de Matrícula de Persona Natural", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Cancelacion-de-matricula-de-PN-ECcio.pdf", format: "pdf", category: "formatos" },
  { title: "Entrega de Libros de Comercio en Sede", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Entrega_libros_comercio_sede_1.pdf", format: "pdf", category: "formatos" },
  { title: "Solicitud de Devolución de Dinero (CCB)", url: "https://ghrevisores.com/wp-content/uploads/2023/05/F-SolicitudDevolucionesdeDineroCCBV004.pdf", format: "pdf", category: "formatos" },
  { title: "Solicitud de Certificados Especiales", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Formato-Solicitud-Certificados-Especiales.pdf", format: "pdf", category: "formatos" },
  { title: "Solicitud de Conformación de Libros Electrónicos", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Formato-de-solicitud-de-conformacion-de-libros-electronicos.pdf", format: "pdf", category: "formatos" },
  { title: "Solicitud de Inscripción de Libros", url: "https://ghrevisores.com/wp-content/uploads/2023/05/formato_inscripciondelibros_IA-F-107v3.pdf", format: "pdf", category: "formatos" },
  { title: "Formulario RUES Ajustado — Instructivo", url: "https://ghrevisores.com/wp-content/uploads/2023/05/formularioRUES_sept26ajustado.pdf", format: "pdf", category: "formatos" },
  { title: "Carta de Responsabilidades — Persona Natural", url: "https://ghrevisores.com/wp-content/uploads/2023/05/IA-F-152_formatocartaderesponsabilidades_personanatural-1.pdf", format: "pdf", category: "formatos" },
  { title: "Carta de Responsabilidades — Persona Jurídica", url: "https://ghrevisores.com/wp-content/uploads/2023/05/IA-F-153_formatocartaresponsabilidades_personajuridica-1.pdf", format: "pdf", category: "formatos" },
  { title: "Localización de Usuarios", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Localizacion-a-usuarios.pdf", format: "pdf", category: "formatos" },
  { title: "Manifestación de Situación de Control", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Manifestacion-de-situacion-de-control-IA-F-150.pdf", format: "pdf", category: "formatos" },
  { title: "Manifestación de NO Existencia de Situación de Control", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Manifestacion-de-no-existencia-de-situacion-de-control-IA-F-151.pdf", format: "pdf", category: "formatos" },
  { title: "Manifestación de Condición de Sociedad BIC", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Manifestacion-expresa-de-condicion-Sociedad-BIC.pdf", format: "pdf", category: "formatos" },
  { title: "Matrícula Mercantil de Establecimientos, Sucursales o Agencias", description: "Formulario RUES — Anexo 1", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Anexo-1_matriculamercantil_orenovacion_establecimientosdecomercio_sucursales_oagencias.pdf", format: "pdf", category: "formatos" },
  { title: "Renovación de Matrícula — Personas Naturales y Jurídicas", description: "Formulario RUES — Anexo 3", url: "https://ghrevisores.com/wp-content/uploads/2023/05/ANEXO_3_formulario_renovacion_matriculamercantil_masde1ano_pendienterenovar_personasnaturales_ojuridicas_ysucursalesdesociedad_extranjera.pdf", format: "pdf", category: "formatos" },
  { title: "Renovación de Matrícula — Establecimientos y Sucursales", description: "Formulario RUES — Anexo 4", url: "https://ghrevisores.com/wp-content/uploads/2023/05/anexo4_formulariorenovacion_matriculamasdeunano_pendienterenovar_establecimientoscomercio_sucursalesyagencias.pdf", format: "pdf", category: "formatos" },
  { title: "Declaración Relativa a Emprendimientos Sociales", description: "Confecámaras", url: "https://ghrevisores.com/wp-content/uploads/2023/05/declaracion-relativa-desarrolloemprendimientos-sociales-confecamaras.pdf", format: "pdf", category: "formatos" },
  { title: "Solicitud de Cambio de Dirección", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Solicitud-cambio-de-direccion-1.pdf", format: "pdf", category: "formatos" },
  { title: "Solicitud de Corrección", url: "https://ghrevisores.com/wp-content/uploads/2023/05/Solicitud_de_correccion_0820173.pdf", format: "pdf", category: "formatos" },
]
