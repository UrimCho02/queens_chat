// clinic 스코프 테이블 접근 헬퍼.
//
// service_role 클라이언트는 RLS(DB 차원 병원 격리)를 우회하므로, 병원 격리가
// 전적으로 코드에 달려 있다. 이 헬퍼는 id 기반 조회/수정/삭제에 clinic_id 조건을
// 자동으로 끼워 넣어, "clinic_id 빠뜨림"으로 인한 cross-tenant 접근을 구조적으로 막는다.
//
// 점진 적용 중 — 현재 단계는 id 기반 메서드만 제공. INSERT/SELECT 헬퍼는 후속 단계에서
// 해당 라우트를 전환할 때 추가한다.
//
// 사용 예:
//   const faqs = clinicScoped(service, "clinic_faqs", clinic.id);
//   const { data: before } = await faqs.getById(id);
//   const { data, error } = await faqs.updateById(id, patch).select().single();
//   const { error } = await faqs.deleteById(id);
export function clinicScoped(service, table, clinicId) {
  return {
    // id 로 1행 조회 — 다른 병원 행이면 null. 소유 확인용.
    getById: (id, columns = "*") =>
      service
        .from(table)
        .select(columns)
        .eq("id", id)
        .eq("clinic_id", clinicId)
        .maybeSingle(),

    // id 로 수정 — clinic_id 까지 일치해야 적용된다. 쿼리빌더를 반환하므로
    // 호출부에서 .select().single() 등을 그대로 체이닝할 수 있다.
    updateById: (id, patch) =>
      service
        .from(table)
        .update(patch)
        .eq("id", id)
        .eq("clinic_id", clinicId),

    // id 로 삭제 — clinic_id 까지 일치해야 적용된다.
    deleteById: (id) =>
      service
        .from(table)
        .delete()
        .eq("id", id)
        .eq("clinic_id", clinicId),
  };
}
