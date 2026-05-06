/**
 * Export utilities for Audit Log + Device Command Log.
 * Supports CSV and PDF (last 7/30 days or custom range).
 */
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportRange = '7d' | '30d';
export type ExportFormat = 'csv' | 'pdf';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const toCsv = (headers: string[], rows: (string | number | null | undefined)[][]) => {
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
};

const sinceFor = (range: ExportRange) =>
  subDays(new Date(), range === '7d' ? 7 : 30).toISOString();

export interface ExportArgs {
  farmId?: string | null;
  userId: string;
  range: ExportRange;
  format: ExportFormat;
  isBn: boolean;
}

/* ----------------- Device Commands ----------------- */
export async function exportDeviceCommandLog(args: ExportArgs) {
  const { farmId, range, format: fmt, isBn } = args;
  let q = supabase
    .from('device_command_log')
    .select('*')
    .gte('created_at', sinceFor(range))
    .order('created_at', { ascending: false })
    .limit(5000);
  if (farmId) q = q.eq('farm_id', farmId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data || [];

  const stamp = format(new Date(), 'yyyyMMdd-HHmm');
  const base = `device-commands-${range}-${stamp}`;
  const title = isBn ? `ডিভাইস কমান্ড লগ (${range})` : `Device Command Log (${range})`;

  if (fmt === 'csv') {
    const headers = [
      'created_at', 'device_name', 'command_type', 'command_value',
      'status', 'source', 'retry_count', 'error_message',
      'sent_at', 'acked_at', 'expired_at', 'command_id',
    ];
    const data = rows.map((r: any) => headers.map(h => r[h]));
    const blob = new Blob(['\ufeff' + toCsv(headers, data)], {
      type: 'text/csv;charset=utf-8;',
    });
    downloadBlob(blob, `${base}.csv`);
  } else {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(title, 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')} | Total: ${rows.length}`, 14, 20);
    autoTable(doc, {
      startY: 24,
      head: [['Time', 'Device', 'Command', 'Val', 'Status', 'Src', 'Retry', 'Error']],
      body: rows.map((r: any) => [
        format(new Date(r.created_at), 'MM-dd HH:mm:ss'),
        r.device_name || '',
        r.command_type || '',
        r.command_value ? 'ON' : 'OFF',
        r.status || '',
        r.source || '',
        `${r.retry_count}/${r.max_retries}`,
        (r.error_message || '').slice(0, 60),
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [31, 122, 62] },
    });
    doc.save(`${base}.pdf`);
  }
  return rows.length;
}

/* ----------------- Audit / Alert Events ----------------- */
export async function exportAuditLog(args: ExportArgs) {
  const { farmId, userId, range, format: fmt, isBn } = args;
  let q = supabase
    .from('farm_audit_logs')
    .select('*')
    .gte('created_at', sinceFor(range))
    .order('created_at', { ascending: false })
    .limit(5000);
  if (farmId) q = q.eq('farm_id', farmId);
  else q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data || [];

  const stamp = format(new Date(), 'yyyyMMdd-HHmm');
  const base = `audit-log-${range}-${stamp}`;
  const title = isBn ? `অডিট ও অ্যালার্ট লগ (${range})` : `Audit & Alert Log (${range})`;

  if (fmt === 'csv') {
    const headers = [
      'created_at', 'severity', 'action_category', 'action_type',
      'device_name', 'target_entity', 'source', 'user_email',
    ];
    const data = rows.map((r: any) => [
      ...headers.map(h => r[h]),
    ]);
    // include serialized old/new value
    headers.push('old_value', 'new_value', 'metadata');
    data.forEach((row, i) => {
      const r: any = rows[i];
      row.push(
        r.old_value ? JSON.stringify(r.old_value) : '',
        r.new_value ? JSON.stringify(r.new_value) : '',
        r.metadata ? JSON.stringify(r.metadata) : '',
      );
    });
    const blob = new Blob(['\ufeff' + toCsv(headers, data)], {
      type: 'text/csv;charset=utf-8;',
    });
    downloadBlob(blob, `${base}.csv`);
  } else {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(title, 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')} | Total: ${rows.length}`, 14, 20);
    autoTable(doc, {
      startY: 24,
      head: [['Time', 'Severity', 'Category', 'Action', 'Device', 'Target', 'Source']],
      body: rows.map((r: any) => [
        format(new Date(r.created_at), 'MM-dd HH:mm:ss'),
        r.severity || '',
        r.action_category || '',
        r.action_type || '',
        r.device_name || '',
        r.target_entity || '',
        r.source || '',
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [31, 122, 62] },
    });
    doc.save(`${base}.pdf`);
  }
  return rows.length;
}
