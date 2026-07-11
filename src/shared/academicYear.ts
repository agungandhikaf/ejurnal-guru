import type { SemesterName } from './types'

export interface SuggestedAcademicContext {
  startYear: number
  endYear: number
  label: string
  semesterName: SemesterName
}

export function formatAcademicYearLabel(startYear: number): string {
  return `${startYear}/${startYear + 1}`
}

export function getSuggestedAcademicContext(date = new Date()): SuggestedAcademicContext {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const isOddSemesterPeriod = month >= 7
  const startYear = isOddSemesterPeriod ? year : year - 1

  return {
    startYear,
    endYear: startYear + 1,
    label: formatAcademicYearLabel(startYear),
    semesterName: isOddSemesterPeriod ? 'GANJIL' : 'GENAP'
  }
}
