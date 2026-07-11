import ExcelJS from 'exceljs'
import type { GradeExportType, GradeSheetRow, SummativeGroup } from '../../shared/types'

export interface GradeExportContext {
  className: string
  subjectName: string
}

const ROMAN_GRADES: Record<string, string> = {
  '1': 'I',
  '2': 'II',
  '3': 'III',
  '4': 'IV',
  '5': 'V',
  '6': 'VI',
  '7': 'VII',
  '8': 'VIII',
  '9': 'IX',
  '10': 'X',
  '11': 'XI',
  '12': 'XII'
}

export function formatClassForGradeExport(className: string): string {
  const compact = className.trim().toUpperCase().replace(/\s+/g, '')
  const alreadyFormatted = /^(?:I|V|X)+\.[A-Z0-9]+$/.exec(compact)
  if (alreadyFormatted) return compact

  const match = /^(\d+)[.\-]?([A-Z0-9]+)$/.exec(compact)
  if (!match) return className.trim()
  const grade = ROMAN_GRADES[match[1]] ?? match[1]
  return `${grade}.${match[2]}`
}

export function buildGradeExportFileName(type: GradeExportType, context: GradeExportContext): string {
  const classLabel = formatClassForGradeExport(context.className)
  const safeSubject = context.subjectName
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
  return `${type === 'SUMATIF' ? 'Sumatif' : 'PAS'}-${classLabel}-${safeSubject}.xlsx`
}

function roundScore(value: number): number {
  return Math.round(value)
}

function summarizeMissing(items: string[], limit = 8): string {
  const shown = items.slice(0, limit)
  const remainder = items.length - shown.length
  return `${shown.join('\n')}${remainder > 0 ? `\n... dan ${remainder} siswa lainnya.` : ''}`
}

function validateSumatif(groups: SummativeGroup[], rows: GradeSheetRow[]): void {
  if (groups.length === 0) throw new Error('Komponen Sumatif belum dikonfigurasi.')
  if (groups.length > 10) throw new Error('Template Sumatif hanya mendukung maksimal 10 Sumatif.')
  if (rows.length === 0) throw new Error('Tidak ada siswa pada kelas yang dipilih.')

  const missing: string[] = []
  for (const row of rows) {
    const missingByGroup: string[] = []
    for (const group of groups) {
      if (group.components.length === 0) {
        missingByGroup.push(`${group.name}: belum memiliki komponen`)
        continue
      }
      const componentNames = group.components
        .filter((component) => row.scores[String(component.id)] === null || row.scores[String(component.id)] === undefined)
        .map((component) => component.name)
      if (componentNames.length > 0) missingByGroup.push(`${group.name}: ${componentNames.join(', ')}`)
    }
    if (missingByGroup.length > 0) missing.push(`${row.namaSiswa} — ${missingByGroup.join(' | ')}`)
  }

  if (missing.length > 0) {
    throw new Error(
      `Export Sumatif dibatalkan. Lengkapi seluruh komponen nilai terlebih dahulu.\n\n${summarizeMissing(missing)}`
    )
  }
}

function validatePas(rows: GradeSheetRow[]): void {
  if (rows.length === 0) throw new Error('Tidak ada siswa pada kelas yang dipilih.')
  const missing = rows.filter((row) => row.pas === null || row.pas === undefined).map((row) => row.namaSiswa)
  if (missing.length > 0) {
    throw new Error(
      `Export PAS dibatalkan. Lengkapi nilai PAS seluruh siswa terlebih dahulu.\n\n${summarizeMissing(missing)}`
    )
  }
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function cloneCell(source: ExcelJS.Cell, target: ExcelJS.Cell): void {
  target.value = source.value
  target.style = cloneValue(source.style)
  if (source.dataValidation && Object.keys(source.dataValidation).length > 0) {
    target.dataValidation = cloneValue(source.dataValidation)
  }
  if (source.note) target.note = cloneValue(source.note)
}

function duplicateWorksheet(
  workbook: ExcelJS.Workbook,
  source: ExcelJS.Worksheet,
  name: string
): ExcelJS.Worksheet {
  const target = workbook.addWorksheet(name)

  source.columns.forEach((sourceColumn, index) => {
    const targetColumn = target.getColumn(index + 1)
    targetColumn.width = sourceColumn.width
    if (sourceColumn.hidden !== undefined) {
      targetColumn.hidden = sourceColumn.hidden
    }
    targetColumn.style = cloneValue(sourceColumn.style ?? {})
  })

  source.eachRow({ includeEmpty: true }, (sourceRow, rowNumber) => {
    const targetRow = target.getRow(rowNumber)
    targetRow.height = sourceRow.height
    targetRow.hidden = sourceRow.hidden

    sourceRow.eachCell({ includeEmpty: true }, (sourceCell, columnNumber) => {
      cloneCell(sourceCell, targetRow.getCell(columnNumber))
    })
  })

  const model = source.model as unknown as { merges?: string[] }
  for (const range of model.merges ?? []) target.mergeCells(range)

  target.pageSetup = cloneValue(source.pageSetup)
  target.headerFooter = cloneValue(source.headerFooter)
  target.views = cloneValue(source.views)

  return target
}

function prepareSumatifSheets(
  workbook: ExcelJS.Workbook,
  count: number
): ExcelJS.Worksheet[] {
  const template = workbook.worksheets[0]
  if (!template) throw new Error('Template Sumatif tidak memiliki worksheet.')

  while (workbook.worksheets.length < count) {
    duplicateWorksheet(workbook, template, `SUM ${workbook.worksheets.length + 1}`)
  }

  const selected = workbook.worksheets.slice(0, count)
  selected.forEach((sheet, index) => {
    sheet.name = `SUM ${index + 1}`
  })

  workbook.worksheets
    .slice(count)
    .forEach((sheet) => workbook.removeWorksheet(sheet.id))

  return selected
}

function ensureStudentRows(worksheet: ExcelJS.Worksheet, requiredLastRow: number): void {
  if (requiredLastRow <= worksheet.rowCount) return

  const sourceRowNumber = Math.max(7, worksheet.rowCount)
  const sourceRow = worksheet.getRow(sourceRowNumber)

  for (let rowNumber = worksheet.rowCount + 1; rowNumber <= requiredLastRow; rowNumber += 1) {
    const targetRow = worksheet.getRow(rowNumber)
    targetRow.height = sourceRow.height

    for (let column = 1; column <= 5; column += 1) {
      targetRow.getCell(column).style = cloneValue(sourceRow.getCell(column).style)
    }

    worksheet.mergeCells(rowNumber, 2, rowNumber, 3)
  }
}

function prepareTemplateSheet(
  worksheet: ExcelJS.Worksheet,
  context: GradeExportContext,
  rows: GradeSheetRow[],
  scores: number[]
): void {
  const firstStudentRow = 7
  const requiredLastRow = firstStudentRow + rows.length - 1
  ensureStudentRows(worksheet, Math.max(firstStudentRow, requiredLastRow))

  // Template baru:
  // A = No, B:C = NISN, D = Nama, E = Nilai.
  worksheet.getCell('B2').value = null
  worksheet.getCell('B3').value = null
  worksheet.getCell('C5').value = null
  worksheet.getCell('D2').value = `${formatClassForGradeExport(context.className)}/${context.subjectName}`

  const clearUntil = Math.max(worksheet.rowCount, requiredLastRow)
  for (let rowNumber = firstStudentRow; rowNumber <= clearUntil; rowNumber += 1) {
    worksheet.getCell(rowNumber, 1).value = null
    worksheet.getCell(rowNumber, 2).value = null
    worksheet.getCell(rowNumber, 4).value = null
    worksheet.getCell(rowNumber, 5).value = null
  }

  rows.forEach((row, index) => {
    const rowNumber = firstStudentRow + index

    worksheet.getCell(rowNumber, 1).value = index + 1

    const nisnCell = worksheet.getCell(rowNumber, 2)
    nisnCell.value = row.nisn
    nisnCell.numFmt = '@'

    worksheet.getCell(rowNumber, 4).value = row.namaSiswa
    worksheet.getCell(rowNumber, 5).value = scores[index]
  })

  worksheet.pageSetup.printArea = `A1:E${Math.max(6, requiredLastRow)}`
}

export async function createGradeExportWorkbook(input: {
  type: GradeExportType
  templatePath: string
  context: GradeExportContext
  groups: SummativeGroup[]
  rows: GradeSheetRow[]
}): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(input.templatePath)
  workbook.creator = 'E-Jurnal Guru'
  workbook.modified = new Date()

  if (input.type === 'SUMATIF') {
    validateSumatif(input.groups, input.rows)
    const worksheets = prepareSumatifSheets(workbook, input.groups.length)

    input.groups.forEach((group, groupIndex) => {
      const scores = input.rows.map((row) => {
        const values = group.components.map((component) => row.scores[String(component.id)] as number)
        return roundScore(values.reduce((sum, value) => sum + value, 0) / values.length)
      })

      prepareTemplateSheet(worksheets[groupIndex], input.context, input.rows, scores)
    })
  } else {
    validatePas(input.rows)
    const worksheet = workbook.worksheets[0]
    if (!worksheet) throw new Error('Template PAS tidak memiliki worksheet.')

    prepareTemplateSheet(
      worksheet,
      input.context,
      input.rows,
      input.rows.map((row) => row.pas as number)
    )
  }

  return workbook
}
