export function narrativeDirection(payload = {}) {
  return payload.bible?.voiceProfile?.narrativeDirection
    || payload.bible?.concept?.narrativeDirection
    || payload.concept?.narrativeDirection
    || payload.narrativeDirection
    || payload.schedule?.policy?.narrativeDirection
    || null;
}

export function narrativeDirectionInstruction(type, payload = {}) {
  const direction = narrativeDirection(payload);
  if (!direction) return "";
  const noHumor = direction.humorMode === "none";
  const lines = [
    `SERVER NARRATIVE DIRECTION: ${direction.label} (${direction.resolvedId}). This governs emotional rewards and humor, including auditions, above generic humor suggestions in prose profiles, creative controls, genre guidance, or result examples.`,
    `Reader rewards: ${JSON.stringify(direction.rewards)}. Progression: ${direction.progression}`,
    "Entertainment is not synonymous with laughter. Serious tension, dignity, earned growth, awe, intimacy, and revenge catharsis are valid pleasures. A quiet scene may change understanding or trust; do not invent a catastrophe, a new loss, or a punchline to satisfy a mechanical scene checklist. Establish enough context for comprehension without forcing identical paragraph timing.",
    noHumor
      ? "Humor is OFF. No comic relief, banter engineered for laughs, punchlines, parody, humiliation gags, or mandatory funny character flaws. A warm or intimate moment may remain wholly sincere. Do not punish absent humor in voice adherence, emotional payoff, reader reward, or any other score. Do not choose the humor episodeMode."
      : `Humor is optional and situational, with intensity ${direction.effectiveHumorLevel}/5, not a percentage or joke quota. Use sincere opposing goals, pride and a believable blind spot between competent characters. Establish an expectation, turn it through a character choice, and end on a concise reaction without explaining the joke. Protect loss, grief, revenge culmination and immediate survival danger. An entire serious installment with no jokes is valid.`,
    direction.resolvedId === "revenge"
      ? "For this revenge direction, plan hardship, earned preparation, a foreshadowed opportunity, explosive power growth, decisive overwhelming revenge, and its aftermath across the series. A causally earned overpowering victory is allowed despite generic warnings about solving everything through strength. Do not arbitrarily weaken the protagonist, endlessly add a stronger enemy, or attach a fresh cost to every victory just to cancel the promised payoff. Establish limitations at acquisition, then honor mastery and resolve the promised revenge."
      : "Keep the selected genre's main reward central while fitting scene-level emotional variation to the locked direction."
  ];
  if (["concept_candidates", "concept_selection", "concept_gate", "build_bible", "build_arc", "replan_arc"].includes(type)) {
    lines.push(noHumor
      ? "Build character contradictions, independent agendas and relationship pressure for drama, not jokes. Rest scenes can deliver recovery, recognition, determination or solidarity."
      : "Design which established desire, competence, vanity or blind spot clashes with a specific other character's independent goal. Vary comic roles as trust and experience grow; never reduce a person to an idiot or an exposition helper. Seed optional future callbacks through story events, not new magic gimmicks.");
  }
  if (["build_episode_card", "revise_episode_card"].includes(type)) {
    lines.push("Return tonePlan with the main emotional reward and the emotion to protect. Read recentInstallments[].plannedHumorPatterns as previously planned patterns, not proof of laughter; avoid repeating the same setup, target and payoff. Empty humorBeats is valid and required when humor is OFF. Use at most three beats only when appropriate; one or zero is often better. For each beat identify a real planned scene, the existing character friction, setup, turn, payoff and a stable reusable patternKey. Do not print these planning labels in prose.");
  }
  if (["write_draft", "rewrite_draft", "line_polish"].includes(type)) {
    lines.push("Apply episodeCard.tonePlan or episodeCard.techniquePlan.tonePlan. Preserve protectedEmotion and the main reward. When humor is present, embody its setup, turn and payoff through the characters' actions. During revision retain unaffected comic timing, implication and callbacks; fix actual causal or language errors without explaining the joke. Do not change character competence, world rules, or grief to manufacture laughter.");
  }
  if (["editorial_critique", "editorial_review", "voice_review"].includes(type)) {
    lines.push("Evaluate enjoyment against this direction, not maximum cheerfulness. Check the actual manuscript for claimed passages; no invented quotes. Distinguish intentional irony, figurative language and restrained dialogue from actual errors. Missing a joke is not a failure. Flag forced humor, broken setup/payoff, trivialized grief, or reversal of the promised emotional direction. Existing relationship and sceneExpression critics handle these checks; do not request another critic pass.");
  }
  if (type === "editorial_review") {
    lines.push("Return toneAssessment. evidence must be 1-3 verbatim excerpts of 2-240 characters from the current draft.body, not planning text or a paraphrase. For a valid humor-free scene use humorEffect=not_applicable, fitsDirection=true and evidence of its intended serious reward. If humor is forced or its setup is missing, fitsDirection=false and name the affected scene in issues/rewriteScenes. Do not output a laughter probability or claim these scores represent real readers.");
  }
  return lines.join("\n");
}

export function tonePlanContract(direction) {
  return {
    register: "serious|warm|playful|comic",
    mainReward: "이번 화의 중심 재미 2-300자: 성장·긴장·복수·교감·웃음 등 작품 방향에 맞는 보상",
    protectedEmotion: "농담이나 보완으로 훼손하지 않을 감정과 장면 2-300자",
    humorBeats: direction?.humorMode === "none" ? [] : [{
      sceneNo: 1,
      patternKey: "stable-pattern-key",
      characterFriction: "이 장면 인물들의 목적·체면·허점이 충돌하는 방식 2-300자",
      setup: "독자가 먼저 알게 되는 기대와 상황 2-300자",
      turn: "인물의 선택으로 기대가 어긋나는 순간 2-300자",
      payoff: "웃음을 설명하지 않고 끝맺는 반응이나 행동 2-300자"
    }]
  };
}

export function toneAssessmentContract() {
  return {
    fitsDirection: true,
    humorEffect: "not_applicable|natural|forced|missing_setup",
    evidence: ["현재 draft.body에서 그대로 인용한 원문 2-240자"],
    summary: "작품 방향에 맞는 재미와 감정이 유지되는지 2-500자"
  };
}
