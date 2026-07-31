export const STORYHEAVEN_SERIAL_GENRES = Object.freeze({
  fantasy: genre("판타지", {
    "power-fantasy": "먼치킨",
    isekai: "이세계",
    "modern-fantasy": "현대판타지",
    "classic-fantasy": "정통판타지",
    "hunter-dungeon": "헌터·던전",
    "regression-possession": "회귀·빙의·환생",
    academy: "아카데미",
    "territory-management": "영지경영",
    "oriental-fantasy": "동양판타지",
    "game-system": "게임·시스템"
  }),
  romance: genre("로맨스", {
    "romance-fantasy": "로맨스판타지",
    "modern-romance": "현대로맨스",
    "office-romance": "오피스로맨스",
    "contract-relationship": "계약관계",
    reunion: "재회",
    "enemies-to-lovers": "혐관·라이벌",
    "court-romance": "궁정로맨스",
    "healing-romance": "힐링로맨스",
    "school-youth-romance": "학원·청춘로맨스",
    "entertainment-romance": "연예계로맨스"
  }),
  "mystery-thriller": genre("미스터리·스릴러", {
    investigation: "수사·추리",
    "closed-circle": "밀실·클로즈드서클",
    survival: "생존",
    psychological: "심리 스릴러",
    occult: "오컬트 미스터리",
    "time-loop": "타임루프",
    conspiracy: "음모론",
    disaster: "재난 스릴러",
    "crime-noir": "범죄·누아르",
    "legal-medical-thriller": "법정·의학 스릴러"
  }),
  sf: genre("SF", {
    cyberpunk: "사이버펑크",
    "space-opera": "스페이스오페라",
    "time-travel": "시간여행",
    "android-ai": "안드로이드·AI",
    dystopia: "디스토피아",
    "near-future": "근미래 기술",
    "first-contact": "외계문명 조우",
    "post-apocalypse": "포스트아포칼립스",
    "hard-sf": "하드 SF",
    "biotech-climate": "바이오·기후 SF"
  }),
  horror: genre("호러", {
    supernatural: "초자연 공포",
    "folk-horror": "민속 공포",
    "urban-legend": "도시괴담",
    "cosmic-horror": "코즈믹 호러",
    "body-horror": "바디 호러",
    "haunted-space": "폐쇄공간 공포",
    "survival-horror": "생존 호러",
    "psychological-horror": "심리 공포",
    "creature-horror": "크리처 호러",
    "apocalyptic-horror": "아포칼립스 호러"
  }),
  "action-adventure": genre("액션·모험", {
    revenge: "복수극",
    martial: "무협",
    hero: "히어로",
    military: "밀리터리",
    heist: "케이퍼·도둑극",
    sports: "스포츠",
    tournament: "토너먼트",
    exploration: "탐험·유적",
    "disaster-rescue": "재난·구조",
    espionage: "첩보·스파이"
  }),
  drama: genre("드라마", {
    family: "가족",
    growth: "성장",
    workplace: "직장",
    "legal-medical": "법정·의학",
    youth: "청춘",
    healing: "힐링",
    "social-drama": "사회극",
    "human-story": "휴먼드라마",
    "entertainment-art": "연예계·예술",
    "food-craft": "요리·장인"
  }),
  historical: genre("시대·역사", {
    "court-politics": "궁중정치",
    war: "전쟁",
    "alternate-history": "대체역사",
    "historical-mystery": "시대추리",
    "merchant-craft": "상업·장인",
    "period-romance": "시대로맨스",
    "folk-adventure": "민담모험",
    biography: "인물극",
    "time-slip": "타임슬립",
    "historical-fantasy": "시대판타지"
  }),
  comedy: genre("코미디", {
    "daily-comedy": "일상 코미디",
    parody: "패러디",
    "black-comedy": "블랙코미디",
    "social-satire": "사회풍자",
    "romantic-comedy": "로맨틱코미디",
    "workplace-comedy": "직장 코미디",
    "gag-slapstick": "개그·슬랩스틱",
    "absurd-comedy": "부조리 코미디",
    "school-comedy": "학원 코미디",
    "family-comedy": "가족 코미디"
  })
});

export const STORYHEAVEN_PRIMARY_GENRE_LIMIT = 3;
export const STORYHEAVEN_SUBGENRE_LIMIT = 10;

export function validateSerialGenreSelection(primaryGenreValue, subgenreValues, { random = Math.random } = {}) {
  const requestedPrimaryGenres = unique(Array.isArray(primaryGenreValue) ? primaryGenreValue : [primaryGenreValue]);
  if (!requestedPrimaryGenres.length) return invalid("serial_primary_genre_invalid");
  if (requestedPrimaryGenres.length > STORYHEAVEN_PRIMARY_GENRE_LIMIT) {
    return invalid("serial_primary_genre_limit", requestedPrimaryGenres);
  }

  const primaryWasRandom = requestedPrimaryGenres.includes("random");
  if (primaryWasRandom && (requestedPrimaryGenres.length !== 1 || requestedPrimaryGenres[0] !== "random")) {
    return invalid("serial_random_primary_exclusive", requestedPrimaryGenres);
  }
  const primaryGenres = primaryWasRandom
    ? [randomKey(STORYHEAVEN_SERIAL_GENRES, random)]
    : requestedPrimaryGenres;
  if (primaryGenres.some((value) => !STORYHEAVEN_SERIAL_GENRES[value])) {
    return invalid("serial_primary_genre_invalid", primaryGenres);
  }

  const requestedByGenre = normalizeSubgenresByGenre(subgenreValues, requestedPrimaryGenres, primaryGenres);
  if (primaryWasRandom) {
    const randomChoices = requestedByGenre.random || requestedByGenre[primaryGenres[0]] || [];
    if (randomChoices.length !== 1 || randomChoices[0] !== "random") {
      return invalid("serial_random_primary_requires_random_subgenre", primaryGenres, requestedByGenre);
    }
    requestedByGenre[primaryGenres[0]] = randomChoices;
    delete requestedByGenre.random;
  }
  if (Object.values(requestedByGenre).flat().length > STORYHEAVEN_SUBGENRE_LIMIT) {
    return invalid("serial_subgenre_limit", primaryGenres, requestedByGenre);
  }

  const subgenresByGenre = {};
  const randomizedSubgenres = [];
  for (const primaryGenre of primaryGenres) {
    const definition = STORYHEAVEN_SERIAL_GENRES[primaryGenre];
    const requested = unique(requestedByGenre[primaryGenre] || []);
    if (!requested.length) return invalid("serial_subgenre_required", primaryGenres, requestedByGenre);
    if (requested.includes("random") && (requested.length !== 1 || requested[0] !== "random")) {
      return invalid("serial_random_subgenre_exclusive", primaryGenres, requestedByGenre);
    }
    const resolved = requested[0] === "random"
      ? [randomKey(definition.subgenres, random)]
      : requested;
    if (resolved.some((value) => !definition.subgenres[value])) {
      return invalid("serial_subgenre_invalid", primaryGenres, requestedByGenre);
    }
    if (requested[0] === "random") randomizedSubgenres.push(primaryGenre);
    subgenresByGenre[primaryGenre] = resolved;
  }

  const subgenres = primaryGenres.flatMap((primaryGenre) => subgenresByGenre[primaryGenre]);
  if (subgenres.length > STORYHEAVEN_SUBGENRE_LIMIT) {
    return invalid("serial_subgenre_limit", primaryGenres, subgenresByGenre);
  }
  const primaryLabels = primaryGenres.map((value) => STORYHEAVEN_SERIAL_GENRES[value].label);
  const subgenreLabelsByGenre = Object.fromEntries(primaryGenres.map((primaryGenre) => [
    primaryGenre,
    subgenresByGenre[primaryGenre].map((value) => STORYHEAVEN_SERIAL_GENRES[primaryGenre].subgenres[value])
  ]));
  const subgenreLabels = primaryGenres.flatMap((primaryGenre) => subgenreLabelsByGenre[primaryGenre]);

  return {
    ok: true,
    primaryGenre: primaryGenres[0],
    primaryLabel: primaryLabels[0],
    primaryGenres,
    primaryLabels,
    subgenres,
    subgenreLabels,
    subgenresByGenre,
    subgenreLabelsByGenre,
    randomized: Object.freeze({
      primaryGenre: primaryWasRandom,
      primaryGenres: primaryWasRandom,
      subgenres: randomizedSubgenres.length > 0,
      subgenresByGenre: Object.freeze(randomizedSubgenres)
    })
  };
}

function normalizeSubgenresByGenre(value, requestedPrimaryGenres, resolvedPrimaryGenres) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).map(([genreId, entries]) => [genreId, unique(entries)]));
  }
  const flat = unique(Array.isArray(value) ? value : []);
  if (resolvedPrimaryGenres.length === 1) {
    const key = requestedPrimaryGenres[0] === "random" ? "random" : resolvedPrimaryGenres[0];
    return { [key]: flat };
  }
  const grouped = Object.fromEntries(resolvedPrimaryGenres.map((genreId) => [genreId, []]));
  for (const subgenre of flat) {
    const owner = resolvedPrimaryGenres.find((genreId) => STORYHEAVEN_SERIAL_GENRES[genreId].subgenres[subgenre]);
    if (owner) grouped[owner].push(subgenre);
    else grouped[resolvedPrimaryGenres[0]].push(subgenre);
  }
  return grouped;
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim()).filter(Boolean))];
}

function invalid(error, primaryGenres = [], subgenresByGenre = {}) {
  return {
    ok: false,
    error,
    primaryGenre: primaryGenres[0] || "",
    primaryGenres,
    subgenres: Object.values(subgenresByGenre).flat(),
    subgenresByGenre
  };
}

function genre(label, subgenres) {
  return Object.freeze({ label, subgenres: Object.freeze(subgenres) });
}

function randomKey(value, random) {
  const keys = Object.keys(value);
  const unit = Number(random());
  const index = Number.isFinite(unit) ? Math.min(keys.length - 1, Math.max(0, Math.floor(unit * keys.length))) : 0;
  return keys[index];
}
