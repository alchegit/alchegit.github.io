const DIRECTIONS = Object.freeze({
  playful: {
    label: "유쾌한 모험",
    rewards: ["모험과 성취", "인물 애착", "관계에서 나오는 웃음"],
    progression: "인물의 유능함과 존엄을 유지하면서 목적·체면·허점의 충돌이 선택과 관계를 바꾸게 한다."
  },
  serious: {
    label: "진중한 서사",
    rewards: ["긴장과 몰입", "인물의 존엄", "성취와 감정적 여운"],
    progression: "갈등의 무게와 인물의 선택을 지키고 긴장·경이·성취·교감으로 보상한다. 웃음으로 감정을 해소하지 않는다."
  },
  revenge: {
    label: "처절한 성장과 복수",
    rewards: ["고난을 견딘 성장", "기연과 힘의 각성", "압도적인 복수의 카타르시스"],
    progression: "손실·생존·수련·단서가 있는 기연·폭발적 성장·복수의 완결을 장기 구조에 배분한다. 획득 근거와 능력 규칙을 지킨 압도적 승리는 정당한 보상이다. 임의 약화나 끝없는 새 적으로 복수를 미루지 않고, 매 승리에 새 대가를 붙여 성취를 취소하지 않는다."
  }
});

export function resolveNarrativeDirection(input = {}, proseStyle = null, humorLevel = 2) {
  const requestedId = input.narrativeDirectionId ?? input.narrativeDirection?.requestedId;
  if (requestedId === undefined || requestedId === null || requestedId === "") return { ok: true, value: null };
  if (!["auto", ...Object.keys(DIRECTIONS)].includes(requestedId)) {
    return { ok: false, error: "serial_narrative_direction_invalid" };
  }
  const resolvedId = requestedId === "auto"
    ? (["serious-grand-v1", "dark-tense-v1"].includes(proseStyle?.resolvedId) ? "serious" : "playful")
    : requestedId;
  const profile = DIRECTIONS[resolvedId];
  const effectiveHumorLevel = resolvedId === "playful" ? humorLevel : 0;
  return {
    ok: true,
    value: {
      version: "2026-09-07",
      requestedId,
      resolvedId,
      label: profile.label,
      humorMode: effectiveHumorLevel === 0 ? "none" : "situational",
      effectiveHumorLevel,
      rewards: effectiveHumorLevel === 0 ? profile.rewards.filter((reward) => reward !== "관계에서 나오는 웃음") : [...profile.rewards],
      progression: profile.progression
    }
  };
}

export function narrativeDirectionFromPayload(payload = {}) {
  return payload.bible?.voiceProfile?.narrativeDirection
    || payload.bible?.concept?.narrativeDirection
    || payload.concept?.narrativeDirection
    || payload.narrativeDirection
    || payload.schedule?.policy?.narrativeDirection
    || null;
}

export function normalizeTonePlan(value, direction, scenes) {
  if (!direction) return null;
  if (!value || typeof value !== "object" || !Array.isArray(value.humorBeats)) {
    throw new Error("serial_tone_plan_invalid");
  }
  if (!["serious", "warm", "playful", "comic"].includes(value.register)) throw new Error("serial_tone_register_invalid");
  if (direction.humorMode === "none" && (value.humorBeats.length || ["playful", "comic"].includes(value.register))) {
    throw new Error("serial_tone_humor_forbidden");
  }
  if (value.humorBeats.length > 3) throw new Error("serial_tone_beats_invalid");
  const sceneNumbers = new Set(scenes.map((scene) => scene.sceneNo));
  return {
    register: value.register,
    mainReward: requiredText(value.mainReward),
    protectedEmotion: requiredText(value.protectedEmotion),
    humorBeats: value.humorBeats.map((beat) => {
      if (!beat || !sceneNumbers.has(beat.sceneNo)) throw new Error("serial_tone_scene_invalid");
      return {
        sceneNo: beat.sceneNo,
        patternKey: requiredText(beat.patternKey, 80),
        characterFriction: requiredText(beat.characterFriction),
        setup: requiredText(beat.setup),
        turn: requiredText(beat.turn),
        payoff: requiredText(beat.payoff)
      };
    })
  };
}

export function normalizeToneAssessment(value, direction, body) {
  if (!direction) return null;
  if (!value || typeof value.fitsDirection !== "boolean"
    || !["not_applicable", "natural", "forced", "missing_setup"].includes(value.humorEffect)
    || !Array.isArray(value.evidence) || value.evidence.length < 1 || value.evidence.length > 3) {
    throw new Error("serial_tone_assessment_invalid");
  }
  const normalizedBody = normalizeWhitespace(body);
  const evidence = value.evidence.map((entry) => requiredText(entry, 240));
  if (evidence.some((entry) => !normalizedBody.includes(normalizeWhitespace(entry)))) {
    throw new Error("serial_tone_evidence_not_in_draft");
  }
  return {
    directionId: direction.resolvedId,
    fitsDirection: value.fitsDirection && !["forced", "missing_setup"].includes(value.humorEffect)
      && (direction.humorMode !== "none" || value.humorEffect === "not_applicable"),
    humorEffect: value.humorEffect,
    evidence,
    summary: requiredText(value.summary, 500)
  };
}

function requiredText(value, max = 300) {
  if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > max) {
    throw new Error("serial_tone_text_invalid");
  }
  return value.trim();
}

function normalizeWhitespace(value) {
  return String(value || "").normalize("NFC").replace(/\s+/gu, " ").trim();
}
