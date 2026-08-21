/**
 * Utilitários de data e fuso horário para o BJJCRON
 * Garante precisão com o fuso horário local brasileiro (UTC-3 / America/Sao_Paulo)
 * e evita discrepâncias entre UTC (ISO) e o calendário local dos treinos noturnos.
 */

import { AttendanceRecord } from '../types';

/**
 * Retorna a data local atual no formato YYYY-MM-DD (respeitando o fuso local do navegador)
 */
export function getLocalDateStr(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna a hora local atual no formato HH:mm
 */
export function getLocalTimeStr(date: Date = new Date()): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Extrai com máxima precisão a data local (YYYY-MM-DD) de um registro de presença.
 * Converte timestamps UTC (ex: 2026-08-21T00:30:00Z) para o dia real no fuso local (ex: 2026-08-20 às 21:30).
 */
export function getAttendanceLocalDate(record: Partial<AttendanceRecord> | { date?: string; timestamp?: string } | null | undefined): string {
  if (!record) return '';

  // 1. Se possuir timestamp completo, converte para o fuso local do navegador
  if (record.timestamp) {
    try {
      const d = new Date(record.timestamp);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch {
      // continua para fallback
    }
  }

  // 2. Se possuir o campo date
  if (record.date) {
    const raw = record.date.trim();
    if (raw.includes('T')) {
      try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          return getLocalDateStr(d);
        }
      } catch {
        return raw.split('T')[0];
      }
    }
    return raw;
  }

  return '';
}

/**
 * Extrai o horário local formatado (HH:mm) de um registro de presença
 */
export function getAttendanceLocalTime(record: Partial<AttendanceRecord> | { timestamp?: string; date?: string } | null | undefined): string {
  if (!record) return '--:--';

  if (record.timestamp) {
    try {
      const d = new Date(record.timestamp);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
    } catch {
      // fallback
    }
  }

  return '--:--';
}

/**
 * Formata uma data YYYY-MM-DD para DD/MM/YYYY
 */
export function formatDateBR(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  if (dateStr instanceof Date) {
    return dateStr.toLocaleDateString('pt-BR');
  }
  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return dateStr;
}

/**
 * Formata data e hora completas para DD/MM/YYYY às HH:mm
 */
export function formatDateTimeBR(isoStringOrDate: string | Date | null | undefined): string {
  if (!isoStringOrDate) return '';
  try {
    const d = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
    if (isNaN(d.getTime())) return String(isoStringOrDate);
    const datePart = d.toLocaleDateString('pt-BR');
    const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} às ${timePart}`;
  } catch {
    return String(isoStringOrDate);
  }
}

/**
 * Verifica se duas datas correspondem ao mesmo dia local
 */
export function isSameLocalDate(d1: string | Date, d2: string | Date): boolean {
  const str1 = typeof d1 === 'string' && d1.length === 10 && !d1.includes('T') ? d1 : (d1 instanceof Date ? getLocalDateStr(d1) : getAttendanceLocalDate({ timestamp: String(d1) }));
  const str2 = typeof d2 === 'string' && d2.length === 10 && !d2.includes('T') ? d2 : (d2 instanceof Date ? getLocalDateStr(d2) : getAttendanceLocalDate({ timestamp: String(d2) }));
  return str1 === str2;
}
