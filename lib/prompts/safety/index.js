// safetyRules 진입점.
// common 룰 + specialty 룰을 합성해 시스템 프롬프트 [톤가이드 + 답변규칙 + 공통규칙 + 카테고리] 텍스트 반환.

import { commonBlock } from "./common";
import { specialtyBlock as obgynBlock } from "./obgyn";
import { specialtyBlock as internalBlock } from "./internal";
import { specialtyBlock as pediatricBlock } from "./pediatric";

const SPECIALTY_MODULES = {
  obgyn: obgynBlock,
  internal: internalBlock,
  pediatric: pediatricBlock,
};

export function safetyRules({
  specialty = "obgyn",
  clinicName,
  bookingUrl,
  tone = "warm",
}) {
  const common = commonBlock({ clinicName, bookingUrl, tone });
  const specialtyFn = SPECIALTY_MODULES[specialty] || SPECIALTY_MODULES.obgyn;
  const specialtySection = specialtyFn({ clinicName, bookingUrl, tone });

  return [
    common.toneGuide,
    common.rulesPrefix,
    specialtySection.rulesAppend,
    common.commonFooter,
    `${common.categoriesPrefix}\n${specialtySection.categoriesAppend}`,
    common.categoriesExample,
  ].join("\n\n");
}
