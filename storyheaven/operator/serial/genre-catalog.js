window.StoryHeavenGenreCatalog = Object.freeze({
  fantasy: entry("판타지", "현실과 다른 규칙이 인물의 선택과 대가를 바꿉니다.", {
    "power-fantasy": "먼치킨", isekai: "이세계", "modern-fantasy": "현대판타지", "classic-fantasy": "정통판타지",
    "hunter-dungeon": "헌터·던전", "regression-possession": "회귀·빙의·환생", academy: "아카데미",
    "territory-management": "영지경영", "oriental-fantasy": "동양판타지", "game-system": "게임·시스템"
  }),
  romance: entry("로맨스", "관계의 거리와 선택이 회차마다 달라집니다.", {
    "romance-fantasy": "로맨스판타지", "modern-romance": "현대로맨스", "office-romance": "오피스로맨스",
    "contract-relationship": "계약관계", reunion: "재회", "enemies-to-lovers": "혐관·라이벌",
    "court-romance": "궁정로맨스", "healing-romance": "힐링로맨스", "school-youth-romance": "학원·청춘로맨스",
    "entertainment-romance": "연예계로맨스"
  }),
  "mystery-thriller": entry("미스터리·스릴러", "단서와 오해를 공정하게 쌓아 진실에 접근합니다.", {
    investigation: "수사·추리", "closed-circle": "밀실·클로즈드서클", survival: "생존", psychological: "심리 스릴러",
    occult: "오컬트 미스터리", "time-loop": "타임루프", conspiracy: "음모론", disaster: "재난 스릴러",
    "crime-noir": "범죄·누아르", "legal-medical-thriller": "법정·의학 스릴러"
  }),
  sf: entry("SF", "기술이나 과학적 가정이 삶의 선택을 바꿉니다.", {
    cyberpunk: "사이버펑크", "space-opera": "스페이스오페라", "time-travel": "시간여행", "android-ai": "안드로이드·AI",
    dystopia: "디스토피아", "near-future": "근미래 기술", "first-contact": "외계문명 조우", "post-apocalypse": "포스트아포칼립스",
    "hard-sf": "하드 SF", "biotech-climate": "바이오·기후 SF"
  }),
  horror: entry("호러", "보이지 않는 위협과 금지된 규칙으로 긴장을 만듭니다.", {
    supernatural: "초자연 공포", "folk-horror": "민속 공포", "urban-legend": "도시괴담", "cosmic-horror": "코즈믹 호러",
    "body-horror": "바디 호러", "haunted-space": "폐쇄공간 공포", "survival-horror": "생존 호러", "psychological-horror": "심리 공포",
    "creature-horror": "크리처 호러", "apocalyptic-horror": "아포칼립스 호러"
  }),
  "action-adventure": entry("액션·모험", "행동과 위험, 성취가 또렷한 속도감 있는 전개입니다.", {
    revenge: "복수극", martial: "무협", hero: "히어로", military: "밀리터리", heist: "케이퍼·도둑극",
    sports: "스포츠", tournament: "토너먼트", exploration: "탐험·유적", "disaster-rescue": "재난·구조", espionage: "첩보·스파이"
  }),
  drama: entry("드라마", "인물의 관계와 감정 변화가 사건의 중심입니다.", {
    family: "가족", growth: "성장", workplace: "직장", "legal-medical": "법정·의학", youth: "청춘",
    healing: "힐링", "social-drama": "사회극", "human-story": "휴먼드라마", "entertainment-art": "연예계·예술", "food-craft": "요리·장인"
  }),
  historical: entry("시대·역사", "시대의 제약과 권력이 인물의 운명을 압박합니다.", {
    "court-politics": "궁중정치", war: "전쟁", "alternate-history": "대체역사", "historical-mystery": "시대추리",
    "merchant-craft": "상업·장인", "period-romance": "시대로맨스", "folk-adventure": "민담모험", biography: "인물극",
    "time-slip": "타임슬립", "historical-fantasy": "시대판타지"
  }),
  comedy: entry("코미디", "인물의 결함과 상황의 어긋남을 반복 가능한 웃음으로 만듭니다.", {
    "daily-comedy": "일상 코미디", parody: "패러디", "black-comedy": "블랙코미디", "social-satire": "사회풍자",
    "romantic-comedy": "로맨틱코미디", "workplace-comedy": "직장 코미디", "gag-slapstick": "개그·슬랩스틱", "absurd-comedy": "부조리 코미디",
    "school-comedy": "학원 코미디", "family-comedy": "가족 코미디"
  })
});

function entry(label, description, subgenres) {
  return Object.freeze({ label, description, subgenres: Object.freeze(subgenres) });
}
