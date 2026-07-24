(() => {
  const id = new URLSearchParams(location.search).get("id");
  const fallback = {
    "seed-last-platform": { title: "막차가 떠난 뒤의 승강장", logline: "종착역에 홀로 남은 청소부가 매일 한 칸씩 가까워지는 정체불명의 열차를 발견한다.", synopsis: "꺼진 행선 안내판 아래, 존재하지 않는 막차가 매일 조금씩 가까워진다. 청소부는 열차가 도착하기 전에 마지막 승객의 이름을 찾아야 한다.", genre: "미스터리", coverPath: "/webtoon/assets/guide/awakening-episode-01-last-train-v4.webp" },
    "seed-rain-memory": { title: "비를 보관하는 잡화점", logline: "잊고 싶은 기억을 빗물에 담아 파는 소녀가 자신의 병만 비어 있음을 발견한다.", synopsis: "사람들의 기억을 빗물에 담아주는 잡화점. 어느 날 주인은 진열장 한가운데 놓인 자신의 빈 병을 발견한다.", genre: "감성판타지", coverPath: "/webtoon/assets/guide/awakening-episode-02-boot-trail-v4.webp" },
    "seed-night-auditor": { title: "13번 야간 감사관", logline: "괴물의 민원을 처리하는 말단 공무원이 인간 세계의 마지막 민원서를 접수한다.", synopsis: "자정 이후에만 열리는 민원실에서 말단 감사관은 접수할 수 없는 인간의 민원 한 장을 받는다.", genre: "현대판타지", coverPath: "/webtoon/assets/guide/awakening-episode-03-inspector-v4.webp" },
    "seed-rescue-window": { title: "구조 요청은 한 번만", logline: "하루에 단 한 명만 구할 수 있는 구조사가 두 곳에서 동시에 울린 신호 앞에 선다.", synopsis: "하루에 한 번만 열리는 구조 창. 같은 시각, 서로 다른 장소에서 가족의 신호가 동시에 들어온다.", genre: "재난드라마", coverPath: "/webtoon/assets/guide/awakening-episode-04-rescue-v4.webp" },
    "seed-airlock-choice": { title: "한 사람만 나갈 수 있다", logline: "산소가 끊긴 연구소에서 서로를 의심하는 생존자들이 마지막 문 앞에서 투표를 시작한다.", synopsis: "남은 산소는 한 사람의 몫. 생존자들은 마지막 문을 열 사람을 고르지만 투표 명단에는 죽은 연구원의 이름이 있다.", genre: "SF스릴러", coverPath: "/webtoon/assets/guide/awakening-episode-05-airlock-choice-v4.webp" },
    "seed-wash-away": { title: "이름을 씻어내는 밤", logline: "지워진 이름이 하수구에서 되살아나는 도시에서 세탁공이 자신의 이름을 발견한다.", synopsis: "도시가 버린 이름을 씻어 없애는 세탁공. 어느 비 오는 밤, 수거함에서 자신의 이름표가 나온다.", genre: "다크판타지", coverPath: "/webtoon/assets/guide/awakening-episode-06-pressure-wash-v4.webp" }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    document.querySelector("[data-report-form]").addEventListener("submit", submitReport);
    await StoryHeavenCommon.init();
    await load();
  });

  async function load() {
    if (!id) {
      fail();
      return;
    }
    try {
      let story;
      try {
        ({ story } = await StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(id)}`, { auth: Boolean(StoryHeavenCommon.state.session) }));
      } catch (error) {
        if (!fallback[id]) throw error;
        story = { ...fallback[id], contentOrigin: "ai_seed", contentRating: "all", author: { nickname: "AI 이야기 씨앗" }, likeCount: 0 };
      }
      document.title = `${story.title} | StoryHeaven`;
      document.querySelector("[data-loading]").hidden = true;
      document.querySelector("[data-detail]").hidden = false;
      const cover = document.querySelector("[data-cover]");
      cover.src = normalizeCover(story.coverPath);
      cover.alt = `${story.title} 표지`;
      document.querySelector("[data-origin]").textContent = story.contentOrigin === "ai_seed" ? "AI SEED STORY" : "READER STORY";
      document.querySelector("[data-title]").textContent = story.title;
      document.querySelector("[data-author]").textContent = story.author?.nickname || "이야기씨앗";
      document.querySelector("[data-genre]").textContent = story.genre;
      document.querySelector("[data-rating]").textContent = story.contentRating === "all" ? "전체 이용" : "12세 이상";
      document.querySelector("[data-likes]").textContent = `좋아요 ${story.likeCount || 0}`;
      document.querySelector("[data-logline]").textContent = story.logline;
      document.querySelector("[data-synopsis]").textContent = story.synopsis || "아직 공개된 줄거리가 없습니다.";
    } catch {
      fail();
    }
  }

  async function submitReport(event) {
    event.preventDefault();
    if (!StoryHeavenCommon.state.session) {
      StoryHeavenCommon.toast("신고를 제출하려면 Google 로그인이 필요합니다.");
      await StoryHeavenCommon.login();
      return;
    }
    const form = event.currentTarget;
    const button = form.querySelector("[data-report-submit]");
    const values = new FormData(form);
    button.disabled = true;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(id)}/report`, {
        method: "POST",
        body: {
          category: values.get("category"),
          details: values.get("details"),
          referenceUrl: values.get("referenceUrl")
        }
      });
      form.reset();
      button.textContent = "접수 완료";
      StoryHeavenCommon.toast("신고가 접수되었습니다. 판정 전에는 작성자에게 신고자 정보가 전달되지 않습니다.");
    } catch (error) {
      button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function fail() {
    document.querySelector("[data-loading]").hidden = true;
    document.querySelector("[data-error]").hidden = false;
  }

  function normalizeCover(value) {
    if (!value) return "../../webtoon/assets/guide/awakening-episode-01-last-train-v4.webp";
    return value.startsWith("/webtoon/") ? `../..${value}` : value;
  }
})();
