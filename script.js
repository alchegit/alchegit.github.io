/*
 * 스타일 출처: NeoKIM의 사이버펑크 테마 기반
 * 스타일 복사일: 2025년 4월 19일
 * 원본 링크: https://codepen.io/Marcus-Moen-the-builder/pen/vEEBRZY
 *
 * 이 스타일시트의 디자인은 위 링크의 작업물을 기반으로 하고 있습니다.
 * 모든 저작권은 원 저작자에게 있습니다.
 */

// 문서가 준비되면 실행할 함수
document.addEventListener("DOMContentLoaded", function () {
  // 변수 및 요소 초기화
  let instabilityCounter = 0;
  const instabilityCounterElement = document.getElementById(
    "instability-counter"
  );
  const cards = document.querySelectorAll(".cyber-card");
  const emailElement = document.getElementById("developerEmail");
  const copyMessage = document.getElementById("copyMessage");
  const copyConfirmation = document.getElementById("copyConfirmation");
  const privateTestCard = document.getElementById("privateTestCard");

  // 실제 개발자 이메일 주소 설정
  const developerEmail = "wlgnsl14@gmail.com";

  // 언어 전환 초기화
  initLanguageToggle();

  // 사이버펑크 효과 - 불안정성 카운터 애니메이션
  const instabilityInterval = setInterval(function () {
    if (Math.random() > 0.7) {
      instabilityCounter = Math.min(
        100,
        instabilityCounter + Math.floor(Math.random() * 5)
      );
    } else {
      instabilityCounter = Math.max(
        0,
        instabilityCounter - Math.floor(Math.random() * 3)
      );
    }

    instabilityCounterElement.textContent = instabilityCounter + "%";

    // 불안정성이 높을 때 글리치 효과 증가
    if (instabilityCounter > 70) {
      document.querySelectorAll(".card-glitch").forEach((glitch) => {
        glitch.style.opacity = "0.7";
      });
    } else {
      document.querySelectorAll(".card-glitch").forEach((glitch) => {
        glitch.style.opacity = "0.3";
      });
    }
  }, 1500);

  // 카드 호버 효과
  cards.forEach((card) => {
    card.addEventListener("mouseover", function () {
      this.querySelectorAll(".card-glow").forEach((glow) => {
        glow.style.opacity = "1";
      });
    });

    card.addEventListener("mouseout", function () {
      this.querySelectorAll(".card-glow").forEach((glow) => {
        glow.style.opacity = "0.5";
      });
    });
  });

  // 모달 초기화 및 표시
  initializeModal();

  if (emailElement) {
    // 사용자 경험 개선을 위해 마우스 오버 시 힌트 표시
    emailElement.addEventListener("mouseenter", function () {
      if (copyMessage) copyMessage.style.opacity = "1";
    });

    emailElement.addEventListener("mouseleave", function () {
      if (copyMessage) copyMessage.style.opacity = "0.7";
    });

    emailElement.addEventListener("click", function () {
      // 실제 이메일 주소를 클립보드에 복사
      navigator.clipboard
        .writeText(developerEmail)
        .then(() => {
          // 성공 시 확인 메시지 표시 및 애니메이션 적용
          if (copyConfirmation) {
            copyConfirmation.style.visibility = "visible";
            copyConfirmation.classList.add("show");

            // 복사 후 메시지 업데이트
            if (copyMessage) {
              const lang = document.documentElement.lang || "ko";
              copyMessage.textContent =
                lang === "ko" ? "(복사됨!)" : "(Copied!)";
              copyMessage.style.color = "#00e5ff";
            }

            // 3초 후 메시지 숨기기 및 원래 상태로 복구
            setTimeout(() => {
              copyConfirmation.classList.remove("show");
              setTimeout(() => {
                copyConfirmation.style.visibility = "hidden";
                if (copyMessage) {
                  const lang = document.documentElement.lang || "ko";
                  copyMessage.textContent =
                    lang === "ko" ? "(클릭하여 복사)" : "(Click to copy)";
                  copyMessage.style.color = "#aaa";
                }
              }, 300);
            }, 3000);
          }
        })
        .catch((err) => {
          console.error("클립보드 복사 실패:", err);
          // 대체 복사 방법 시도
          fallbackCopyTextToClipboard(developerEmail);
        });
    });
  }

  // 구형 브라우저를 위한 대체 복사 메서드
  function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // 화면 바깥에 위치시키기
    textArea.style.position = "fixed";
    textArea.style.top = "-999px";
    textArea.style.left = "-999px";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful && copyConfirmation) {
        copyConfirmation.style.visibility = "visible";
        copyConfirmation.classList.add("show");

        if (copyMessage) {
          const lang = document.documentElement.lang || "ko";
          copyMessage.textContent = lang === "ko" ? "(복사됨!)" : "(Copied!)";
          copyMessage.style.color = "#00e5ff";
        }

        setTimeout(() => {
          copyConfirmation.classList.remove("show");
          setTimeout(() => {
            copyConfirmation.style.visibility = "hidden";
            if (copyMessage) {
              const lang = document.documentElement.lang || "ko";
              copyMessage.textContent =
                lang === "ko" ? "(클릭하여 복사)" : "(Click to copy)";
              copyMessage.style.color = "#aaa";
            }
          }, 300);
        }, 3000);
      }
    } catch (err) {
      console.error("대체 클립보드 복사 실패:", err);
    }

    document.body.removeChild(textArea);
  }

  // 개인 테스트 카드 클릭 시 모달 표시
  if (privateTestCard) {
    privateTestCard.addEventListener("click", function (e) {
      e.preventDefault();
      showModal();
    });
  }

  // 모달 초기화 함수
  function initializeModal() {
    // 모달 요소
    const welcomeModal = new bootstrap.Modal(
      document.getElementById("welcomeModal"),
      {
        backdrop: "static",
        keyboard: false,
      }
    );

    // 페이지 로드 시 3초 후 모달 표시 (최초 방문자 환영 효과)
    setTimeout(function () {
      if (Math.random() > 0.5 && !sessionStorage.getItem("modalShown")) {
        welcomeModal.show();
        sessionStorage.setItem("modalShown", "true");
      }
    }, 3000);
  }

  // 모달 표시 함수
  function showModal() {
    const welcomeModal = new bootstrap.Modal(
      document.getElementById("welcomeModal")
    );
    welcomeModal.show();
  }

  // 이메일 복사 함수
  function copyEmailToClipboard() {
    const emailText = developerEmail.textContent;
    const textArea = document.createElement("textarea");
    textArea.value = emailText;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();

    try {
      // 복사 명령 실행
      const successful = document.execCommand("copy");

      // 복사 알림 표시 및 애니메이션
      if (successful) {
        copyConfirmation.classList.add("show");

        // 3초 후 알림 숨기기
        setTimeout(() => {
          copyConfirmation.classList.remove("show");

          // 애니메이션 완료 후 완전히 숨기기
          setTimeout(() => {
            copyConfirmation.style.visibility = "hidden";
          }, 300);
        }, 3000);
      }
    } catch (err) {
      console.error("이메일 복사 중 오류 발생:", err);
    }

    document.body.removeChild(textArea);
  }

  // 언어 전환 초기화 함수
  function initLanguageToggle() {
    // 브라우저 언어 감지
    const userLang = navigator.language || navigator.userLanguage;
    let currentLang = userLang.startsWith("ko") ? "ko" : "en";

    // 저장된 언어 설정이 있으면 사용
    if (localStorage.getItem("preferredLanguage")) {
      currentLang = localStorage.getItem("preferredLanguage");
    }

    // 초기 언어 설정 적용
    setLanguage(currentLang);

    // 언어 전환 버튼 추가 (아직 구현되지 않음 - 나중에 추가 예정)
    // 언어 스위치 버튼을 만들려면 여기에 코드 추가
  }

  // 언어 설정 적용 함수
  function setLanguage(lang) {
    // 타이틀 설정
    document.title = document
      .querySelector(`title`)
      .getAttribute(`data-lang-${lang}`);

    // 모든 다국어 요소 순회하면서 해당 언어 적용
    document.querySelectorAll(`[data-lang-${lang}]`).forEach((elem) => {
      elem.textContent = elem.getAttribute(`data-lang-${lang}`);
    });

    // 이미지 alt 텍스트 업데이트
    document.querySelectorAll(`[data-lang-${lang}-alt]`).forEach((elem) => {
      elem.setAttribute("alt", elem.getAttribute(`data-lang-${lang}-alt`));
    });

    // 현재 언어 저장
    localStorage.setItem("preferredLanguage", lang);
  }
});
