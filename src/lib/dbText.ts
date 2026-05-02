/**
 * 持久化可选文本：trim；空或仅空白 → null（避免库里长期存 ""，便于查询与排序）。
 */
export function normalizeOptionalDbText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = value.trim();
  return t.length === 0 ? null : t;
}
