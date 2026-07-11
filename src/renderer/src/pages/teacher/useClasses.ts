import { useEffect, useState } from 'react'
import type { SchoolClass } from '@shared/types'
import { unwrap } from '../../lib/api'

export function useClasses(academicYearId?: number): { classes: SchoolClass[]; error: string } {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!academicYearId) return
    window.api.teacher.classes(academicYearId)
      .then((r) => setClasses(unwrap<SchoolClass[]>(r)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat kelas.'))
  }, [academicYearId])
  return { classes, error }
}
