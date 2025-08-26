export function nameOf(p: any): string {
  return p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Unknown';
}
export function tagsFor(p: any): string {
  const t: string[] = [];
  if (p?.injury_status === 'Questionable') t.push('⚠️ Q');
  if (p?.injury_status === 'Doubtful')     t.push('🟠 D');
  if (p?.injury_status === 'Out')          t.push('⛔ Out');
  return t.join(' ');
}
