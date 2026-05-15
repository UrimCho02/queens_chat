// before/after 두 JSONB 객체를 비교해 변경된 필드 배열 반환.
// /admin/logs 페이지에서 update 행 펼쳤을 때 "필드: 옛값 → 새값" 형태로 표시.
//
// 동작:
//   - create (before=null) → 모든 필드를 "→ 새값"으로
//   - delete (after=null)  → 모든 필드를 "옛값 →"으로
//   - update                → 실제로 다른 필드만
//   - id/clinic_id/created_at/updated_at 같은 메타 컬럼은 항상 제외

const META_COLUMNS = new Set([
  "id",
  "clinic_id",
  "record_id",
  "created_at",
  "updated_at",
]);

export function diffJsonb(before, after) {
  if (!before && !after) return [];

  if (!before) {
    return Object.keys(after)
      .filter((k) => !META_COLUMNS.has(k))
      .map((k) => ({ field: k, before: undefined, after: after[k] }));
  }

  if (!after) {
    return Object.keys(before)
      .filter((k) => !META_COLUMNS.has(k))
      .map((k) => ({ field: k, before: before[k], after: undefined }));
  }

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((k) => !META_COLUMNS.has(k))
    .map((k) => {
      const b = before[k];
      const a = after[k];
      if (sameValue(b, a)) return null;
      return { field: k, before: b, after: a };
    })
    .filter(Boolean);
}

function sameValue(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a == b;
  if (typeof a !== "object" && typeof b !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
