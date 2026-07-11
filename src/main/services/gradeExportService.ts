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

function cloneCellStyle(source: ExcelJS.Cell, target: ExcelJS.Cell): void {
  target.style = JSON.parse(JSON.stringify(source.style)) as ExcelJS.Style
}

function ensureStudentRows(worksheet: ExcelJS.Worksheet, requiredLastRow: number): void {
  if (requiredLastRow <= worksheet.rowCount) return
  const sourceRowNumber = Math.max(7, worksheet.rowCount)
  const sourceRow = worksheet.getRow(sourceRowNumber)
  for (let rowNumber = worksheet.rowCount + 1; rowNumber <= requiredLastRow; rowNumber += 1) {
    const targetRow = worksheet.getRow(rowNumber)
    targetRow.height = sourceRow.height
    for (let column = 1; column <= 6; column += 1) {
      cloneCellStyle(sourceRow.getCell(column), targetRow.getCell(column))
    }
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

  worksheet.getCell('B2').value = null
  worksheet.getCell('B3').value = null
  for (let column = 2; column <= 6; column += 1) worksheet.getRow(5).getCell(column).value = null
  worksheet.getCell('E2').value = `${formatClassForGradeExport(context.className)}/${context.subjectName}`

  const clearUntil = Math.max(worksheet.rowCount, requiredLastRow)
  for (let rowNumber = firstStudentRow; rowNumber <= clearUntil; rowNumber += 1) {
    for (let column = 1; column <= 6; column += 1) worksheet.getRow(rowNumber).getCell(column).value = null
  }

  rows.forEach((row, index) => {
    const target = worksheet.getRow(firstStudentRow + index)
    target.getCell(1).value = index + 1
    target.getCell(2).value = null // ID siswa web internal sekolah sengaja dikosongkan.
    target.getCell(3).value = null // NIS belum tersedia di aplikasi.
    target.getCell(4).value = row.nisn
    target.getCell(4).numFmt = '@'
    target.getCell(5).value = row.namaSiswa
    target.getCell(6).value = scores[index]
  })

  worksheet.getColumn(2).hidden = true
  worksheet.pageSetup.printArea = `A1:F${Math.max(6, requiredLastRow)}`
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
    if (workbook.worksheets.length < input.groups.length) {
      throw new Error('Jumlah sheet pada Template Sumatif tidak mencukupi.')
    }

    const unusedSheets = workbook.worksheets.slice(input.groups.length)
    unusedSheets.forEach((sheet) => workbook.removeWorksheet(sheet.id))

    input.groups.forEach((group, groupIndex) => {
      const scores = input.rows.map((row) => {
        const values = group.components.map((component) => row.scores[String(component.id)] as number)
        return roundScore(values.reduce((sum, value) => sum + value, 0) / values.length)
      })
      const worksheet = workbook.worksheets[groupIndex]
      prepareTemplateSheet(worksheet, input.context, input.rows, scores)
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
