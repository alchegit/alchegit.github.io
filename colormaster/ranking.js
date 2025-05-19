document.addEventListener("DOMContentLoaded", () => {
  // 상태 요소
  const statusText = document.querySelector(".status-text");
  const lastUpdate = document.getElementById("last-update");
  const monthSlider = document.getElementById("month-slider");
  const rankingsList = document.getElementById("rankings-list");

  // 랭킹 데이터를 저장할 변수
  let rankingData = [];

  // 현재 날짜 정보 (기본 데이터 로딩용)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, "0");

  // 파일명 형식 생성 (YYMM)
  const defaultFileName = `${currentYear
    .toString()
    .substring(2)}${currentMonth}`;

  // 이벤트 팝업 초기화 및 표시
  // initializeEventPopup();

  // 이벤트 팝업 초기화 함수
  function initializeEventPopup() {
    console.log("팝업 초기화 시작");
    
    // 팝업이 이전에 닫히지 않았다면 표시
    if (shouldShowPopup()) {
      setTimeout(() => {
        console.log("팝업 표시 시도");
        const popup = document.getElementById("event-popup");
        if (popup) {
          // Bootstrap 모달 표시
          const modal = new bootstrap.Modal(popup);
          modal.show();
          console.log("팝업 표시됨");
          
          // 이메일 복사 기능 설정
          setupEmailCopy();
        } else {
          console.log("팝업 요소를 찾을 수 없음");
        }
      }, 1000); // 1초 후 팝업 표시
    } else {
      console.log("팝업 표시 조건이 충족되지 않음");
    }

    // 닫기 버튼에 이벤트 리스너 추가
    const closeButton = document.querySelector("[data-bs-dismiss='modal']");
    if (closeButton) {
      closeButton.addEventListener("click", function() {
        // 체크박스 상태 확인
        const dontShowAgainToday = document.getElementById("dontShowAgainToday");
        if (dontShowAgainToday && dontShowAgainToday.checked) {
          // 오늘 날짜를 저장
          const today = new Date().toDateString();
          localStorage.setItem("popupDismissedToday", today);
          console.log("오늘 하루 다시 열지 않기 설정됨");
        }
      });
    }
    
    // 모달이 닫힐 때 체크박스 상태 확인
    const popup = document.getElementById("event-popup");
    if (popup) {
      popup.addEventListener("hidden.bs.modal", function() {
        const dontShowAgainToday = document.getElementById("dontShowAgainToday");
        if (dontShowAgainToday && dontShowAgainToday.checked) {
          // 오늘 날짜를 저장
          const today = new Date().toDateString();
          localStorage.setItem("popupDismissedToday", today);
          console.log("오늘 하루 다시 열지 않기 설정됨");
        }
      });
    }
  }
  
  // 오늘 하루 다시 열지 않기 체크박스 설정
  function setupDontShowAgainCheckbox() {
    const popup = document.getElementById("event-popup");
    const checkbox = document.getElementById("dontShowAgainToday");

    if (popup && checkbox) {
      popup.addEventListener("hidden.bs.modal", function () {
        if (checkbox.checked) {
          // 오늘 날짜를 저장
          const today = new Date().toDateString();
          localStorage.setItem("popupDismissedToday", today);
          console.log("오늘 하루 다시 열지 않기 설정됨");
        }
      });
    }
  }

  // 이메일 복사 기능 설정
  function setupEmailCopy() {
    const emailElement = document.getElementById("popupDevEmail");
    const copyConfirmation = document.getElementById("popupCopyConfirmation");
    
    if (emailElement) {
      // 이메일 텍스트 설정 - "개발자 이메일"로 표시되도록 유지
      if (emailElement.textContent !== "개발자 이메일") {
        emailElement.textContent = "개발자 이메일";
      }
      
      emailElement.addEventListener("click", function() {
        // 실제 개발자 이메일 주소를 클립보드에 복사
        const realEmail = "wlgnsl14@gmail.com";
        
        navigator.clipboard.writeText(realEmail)
          .then(() => {
            // 성공 시 확인 메시지 표시
            if (copyConfirmation) {
              copyConfirmation.classList.add("show");
              
              // 3초 후 메시지 숨기기
              setTimeout(() => {
                copyConfirmation.classList.remove("show");
              }, 3000);
            }
          })
          .catch(err => {
            console.error("클립보드 복사 실패:", err);
            // 대체 복사 방법 시도
            fallbackCopyTextToClipboard(realEmail);
          });
      });
    }
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
      const successful = document.execCommand('copy');
      if (successful) {
        const copyConfirmation = document.getElementById("popupCopyConfirmation");
        if (copyConfirmation) {
          copyConfirmation.classList.add("show");
          
          setTimeout(() => {
            copyConfirmation.classList.remove("show");
          }, 3000);
        }
      }
    } catch (err) {
      console.error("대체 클립보드 복사 실패:", err);
    }
    
    document.body.removeChild(textArea);
  }

  // 하드코딩된 데이터 사용 (모든 로드 방법이 실패할 경우)
  function useHardcodedData() {
    console.log("데이터를 불러올 수 없습니다.");
    statusText.textContent =
      detectLanguage() === "ko" ? "데이터 로드 실패" : "DATA LOAD FAILED";
    statusText.style.color = "#f55";

    // 랭킹 목록에 데이터 없음 메시지 표시
    rankingsList.innerHTML = `<div class="error-message" style="margin-top: 30px;">${
      detectLanguage() === "ko"
        ? "랭킹 데이터를 불러올 수 없습니다. 나중에 다시 시도해주세요."
        : "Unable to load ranking data. Please try again later."
    }</div>`;

    // 빈 월별 버튼 생성 (데이터 없음 표시)
    monthSlider.innerHTML = "";
    const noDataTag = document.createElement("div");
    noDataTag.className = "month-tag active";
    noDataTag.textContent =
      detectLanguage() === "ko" ? "데이터 없음" : "No Data";
    monthSlider.appendChild(noDataTag);

    // 마지막 업데이트 시간 표시 삭제
    lastUpdate.textContent = "";
  }

  // 데이터 처리 함수 수정
  function processRankingData(text, fileName) {
    try {
      // 텍스트 파싱 (줄 단위로 분리)
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

      if (lines.length < 3) {
        throw new Error("파일에 충분한 데이터가 없습니다.");
      }

      // 첫 번째 줄: last_updated 정보 추출 및 표시
      const lastUpdatedMatch = lines[0].match(/last_updated:(.+)/);
      let lastUpdatedValue = "";

      if (lastUpdatedMatch && lastUpdatedMatch[1]) {
        lastUpdatedValue = lastUpdatedMatch[1].trim();
        lastUpdate.textContent = `LAST UPDATE: ${lastUpdatedValue}`;
        console.log(`마지막 업데이트 시간: ${lastUpdatedValue}`);
      }

      // 두 번째 줄: 헤더
      const headers = lines[1].split("\t").map((header) => header.trim());
      console.log(`헤더: ${headers.join(", ")}`);

      // 기존 데이터 초기화
      rankingData = [];

      // 세 번째 줄부터 데이터 행 파싱
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 탭으로 구분된 값 추출
        const values = line.split("\t");
        const entry = {};

        // 각 항목을 키-값 쌍으로 객체에 저장
        headers.forEach((header, index) => {
          if (index < values.length) {
            let value = values[index].trim();

            // 따옴표 제거 (양쪽 모두 따옴표가 있는 경우에만)
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.substring(1, value.length - 1);
            }

            // 숫자로 변환 가능한 값은 숫자로 변환
            if (!isNaN(value) && value !== "") {
              entry[header] = Number(value);
            } else {
              entry[header] = value;
            }
          }
        });

        // ID 정보 추출
        if (headers.includes("Document_ID")) {
          entry.userId = entry.Document_ID;
        }

        // 파일의 last_updated 정보를 각 엔트리에 저장
        if (lastUpdatedValue) {
          entry._lastUpdated = lastUpdatedValue;
        }

        // 모든 필수 필드가 있는 경우만 추가
        if (
          entry.score !== undefined &&
          entry.elapsedMillis !== undefined &&
          entry.updatedAt !== undefined &&
          (entry.userId !== undefined || entry.Document_ID !== undefined)
        ) {
          rankingData.push(entry);
        }
      }

      console.log(`${rankingData.length}개의 랭킹 데이터를 로드했습니다.`);

      // 데이터 그룹화 및 월별 버튼 생성
      const monthlyData = groupDataByMonth();
      createMonthButtons(monthlyData);

      statusText.textContent =
        detectLanguage() === "ko" ? "연결됨" : "CONNECTED";
      statusText.style.color = "#0fa";
    } catch (error) {
      console.error("데이터 처리 오류:", error);
      statusText.textContent =
        detectLanguage() === "ko" ? "오류 발생" : "ERROR";
      statusText.style.color = "#f55";
      rankingsList.innerHTML = `<div class="error-message">${
        detectLanguage() === "ko"
          ? "데이터를 처리하는 중 오류가 발생했습니다."
          : "An error occurred while processing the data."
      }</div>`;

      // 오류 발생 시 하드코딩된 데이터 사용
      useHardcodedData();
    }
  }

  // 사용 가능한 월별 파일 목록 로딩
  function loadAvailableMonths() {
    // 백업 파일 목록 - 최신 순으로 정렬 (필요할 때마다 여기에 추가)
    const backupFiles = [
      "2504",
      "2505",
      "2506",
      "2507",
      "2508",
      "2509",
      "2510",
      "2511",
      "2512",
    ];

    // 실제 로드된 파일 목록
    const loadedFiles = [];

    // 첫 번째 파일 로드 시도 (최신 파일 먼저)
    loadNextFile(0);

    // 재귀적으로 파일 로드 시도
    function loadNextFile(index) {
      if (index >= backupFiles.length) {
        if (loadedFiles.length === 0) {
          console.log(
            "사용 가능한 파일이 없습니다. 하드코딩된 데이터를 사용합니다."
          );
          useHardcodedData();
        }
        return;
      }

      const fileName = backupFiles[index];
      const filePath = `backup_${fileName}.txt`;

      console.log(`파일 로드 시도: ${filePath}`);

      fetch(filePath)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`파일을 불러올 수 없습니다: ${response.status}`);
          }
          return response.text();
        })
        .then((text) => {
          console.log(`파일 내용 가져옴 (${fileName}): ${text.length} 바이트`);

          // 이미 로드된 파일이 없을 경우에만 화면에 표시
          if (loadedFiles.length === 0) {
            processRankingData(text, fileName);
          } else {
            // 두 번째 이상의 파일은 데이터만 추가
            processAdditionalData(text, fileName);
          }

          // 로드된 파일 목록에 추가
          loadedFiles.push(fileName);

          // 다음 파일 로드 시도
          loadNextFile(index + 1);
        })
        .catch((error) => {
          console.log(`${fileName} 파일 로드 실패: ${error}`);
          // 다음 파일 시도
          loadNextFile(index + 1);
        });
    }

    // 추가 데이터 처리 함수도 수정
    function processAdditionalData(text, fileName) {
      try {
        // 텍스트 파싱 (줄 단위로 분리)
        const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

        if (lines.length < 3) {
          throw new Error("파일에 충분한 데이터가 없습니다.");
        }

        // 첫 번째 줄: last_updated 정보 추출
        const lastUpdatedMatch = lines[0].match(/last_updated:(.+)/);
        let lastUpdatedValue = "";

        if (lastUpdatedMatch && lastUpdatedMatch[1]) {
          lastUpdatedValue = lastUpdatedMatch[1].trim();
        }

        // 두 번째 줄: 헤더
        const headers = lines[1].split("\t").map((header) => header.trim());

        // 추가 데이터를 위한 임시 배열
        const additionalData = [];

        // 세 번째 줄부터 데이터 행 파싱
        for (let i = 2; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // 탭으로 구분된 값 추출
          const values = line.split("\t");
          const entry = {};

          // 각 항목을 키-값 쌍으로 객체에 저장
          headers.forEach((header, index) => {
            if (index < values.length) {
              let value = values[index].trim();

              // 따옴표 제거 (양쪽 모두 따옴표가 있는 경우에만)
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
              }

              // 숫자로 변환 가능한 값은 숫자로 변환
              if (!isNaN(value) && value !== "") {
                entry[header] = Number(value);
              } else {
                entry[header] = value;
              }
            }
          });

          // ID 정보 추출
          if (headers.includes("Document_ID")) {
            entry.userId = entry.Document_ID;
          }

          // 파일의 last_updated 정보를 각 엔트리에 저장
          if (lastUpdatedValue) {
            entry._lastUpdated = lastUpdatedValue;
          }

          // 모든 필수 필드가 있는 경우만 추가
          if (
            entry.score !== undefined &&
            entry.elapsedMillis !== undefined &&
            entry.updatedAt !== undefined &&
            (entry.userId !== undefined || entry.Document_ID !== undefined)
          ) {
            additionalData.push(entry);
          }
        }

        // 기존 데이터에 추가
        rankingData = [...rankingData, ...additionalData];
        console.log(
          `${additionalData.length}개의 추가 랭킹 데이터를 로드했습니다. (${fileName})`
        );

        // 데이터 그룹화 및 월별 버튼 다시 생성
        const monthlyData = groupDataByMonth();
        createMonthButtons(monthlyData);
      } catch (error) {
        console.error(`추가 데이터 처리 오류 (${fileName}):`, error);
      }
    }
  }

  // 언어 감지 및 설정
  function detectLanguage() {
    const languages = navigator.languages || [
      navigator.language || navigator.userLanguage,
    ];
    const preferredLang = languages[0].toLowerCase();
    return preferredLang.startsWith("ko") ? "ko" : "en";
  }

  // 언어 변경 함수
  function updateLanguage() {
    const lang = detectLanguage();

    // HTML lang 속성 변경
    document.documentElement.lang = lang;

    // 모든 다국어 요소 업데이트
    document.querySelectorAll(`[data-lang-${lang}]`).forEach((element) => {
      const text = element.getAttribute(`data-lang-${lang}`);
      if (text) element.textContent = text;
    });
  }

  // 초기 언어 설정
  updateLanguage();

  // 시간 형식 변환 함수 (밀리초 -> 시분초)
  function formatElapsedTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000) % 60;
    const minutes = Math.floor(milliseconds / (1000 * 60)) % 60;
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));

    let result = "";

    if (hours > 0) {
      result += `${hours}시 `;
    }

    if (minutes > 0 || hours > 0) {
      result += `${minutes}분 `;
    }

    result += `${seconds}초`;

    return result;
  }

  // 날짜 파싱 함수 업데이트
  function parseDate(dateString) {
    try {
      // "2025년 5월 7일 오후 1시 4분 9초 UTC+9" 형식 파싱
      const yearMatch = dateString.match(/(\d+)년/);
      const monthMatch = dateString.match(/(\d+)월/);
      const dayMatch = dateString.match(/(\d+)일/);

      if (!yearMatch || !monthMatch || !dayMatch) {
        console.error("날짜 형식 파싱 오류:", dateString);
        return {
          year: "2025",
          month: "05",
          day: "01",
          formattedDate: "2025/05/01 00:00:00",
        }; // 기본값 반환
      }

      const year = yearMatch[1];
      const month = monthMatch[1].padStart(2, "0");
      const day = dayMatch[1].padStart(2, "0");

      // 시간 추출
      let hours = 0;
      let minutes = 0;
      let seconds = 0;

      const hoursMatch = dateString.match(/(\d+)시/);
      const minutesMatch = dateString.match(/(\d+)분/);
      const secondsMatch = dateString.match(/(\d+)초/);

      if (hoursMatch) hours = parseInt(hoursMatch[1]);
      if (minutesMatch) minutes = parseInt(minutesMatch[1]);
      if (secondsMatch) seconds = parseInt(secondsMatch[1]);

      // 오전/오후 확인
      if (dateString.includes("오후") && hours < 12) {
        hours += 12;
      }

      // 시간 형식 맞추기
      const formattedHours = hours.toString().padStart(2, "0");
      const formattedMinutes = minutes.toString().padStart(2, "0");
      const formattedSeconds = seconds.toString().padStart(2, "0");

      // yyyy/MM/dd HH:mm:ss 형식으로 변환
      const formattedDate = `${year}/${month}/${day} ${formattedHours}:${formattedMinutes}:${formattedSeconds}`;

      return {
        year,
        month,
        day,
        hours: formattedHours,
        minutes: formattedMinutes,
        seconds: formattedSeconds,
        formattedDate,
      };
    } catch (error) {
      console.error("날짜 파싱 오류:", error);
      return {
        year: "2025",
        month: "05",
        day: "01",
        formattedDate: "2025/05/01 00:00:00",
      }; // 오류 시 기본값
    }
  }

  // 월별 데이터 그룹화
  function groupDataByMonth() {
    const monthlyData = {};

    rankingData.forEach((item) => {
      if (!item.updatedAt) return; // updatedAt이 없는 항목 무시

      try {
        const date = parseDate(item.updatedAt);
        const monthKey = `${date.year}.${date.month}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = [];
        }

        monthlyData[monthKey].push(item);
      } catch (error) {
        console.error("데이터 그룹화 오류:", error);
      }
    });

    return monthlyData;
  }

  // 월 슬라이더 개선 함수
  function enhanceMonthSlider() {
    const monthSlider = document.getElementById("month-slider");

    // 스크롤 힌트 추가
    const leftHint = document.createElement("div");
    leftHint.className = "month-scroll-hint month-scroll-hint-left";

    const rightHint = document.createElement("div");
    rightHint.className = "month-scroll-hint month-scroll-hint-right";

    monthSlider.appendChild(leftHint);
    monthSlider.appendChild(rightHint);

    // 스크롤 위치에 따른 힌트 표시/숨김
    function updateScrollHints() {
      // 스크롤이 가능한지 확인
      const isScrollable = monthSlider.scrollWidth > monthSlider.clientWidth;

      // 왼쪽/오른쪽 끝에 도달했는지 확인
      const isAtStart = monthSlider.scrollLeft <= 10;
      const isAtEnd =
        monthSlider.scrollLeft >=
        monthSlider.scrollWidth - monthSlider.clientWidth - 10;

      // 힌트 표시/숨김
      leftHint.style.opacity = isScrollable && !isAtStart ? "0.8" : "0";
      rightHint.style.opacity = isScrollable && !isAtEnd ? "0.8" : "0";
    }

    // 초기 상태 설정
    updateScrollHints();

    // 스크롤 이벤트에 따른 힌트 업데이트
    monthSlider.addEventListener("scroll", updateScrollHints);

    // 윈도우 크기 변경 시 힌트 업데이트
    window.addEventListener("resize", updateScrollHints);

    // 터치/마우스 스크롤 보조 기능
    let isDown = false;
    let startX;
    let scrollLeft;

    // 터치/마우스 이벤트 핸들러
    monthSlider.addEventListener("mousedown", (e) => {
      isDown = true;
      monthSlider.classList.add("active-drag");
      startX = e.pageX - monthSlider.offsetLeft;
      scrollLeft = monthSlider.scrollLeft;
    });

    monthSlider.addEventListener("mouseleave", () => {
      isDown = false;
      monthSlider.classList.remove("active-drag");
    });

    monthSlider.addEventListener("mouseup", () => {
      isDown = false;
      monthSlider.classList.remove("active-drag");
    });

    monthSlider.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - monthSlider.offsetLeft;
      const walk = (x - startX) * 2; // 스크롤 속도 조절
      monthSlider.scrollLeft = scrollLeft - walk;
      updateScrollHints();
    });

    // 터치 이벤트 지원 (모바일)
    monthSlider.addEventListener(
      "touchstart",
      (e) => {
        isDown = true;
        monthSlider.classList.add("active-drag");
        startX = e.touches[0].pageX - monthSlider.offsetLeft;
        scrollLeft = monthSlider.scrollLeft;
      },
      { passive: true }
    );

    monthSlider.addEventListener("touchend", () => {
      isDown = false;
      monthSlider.classList.remove("active-drag");
    });

    monthSlider.addEventListener("touchcancel", () => {
      isDown = false;
      monthSlider.classList.remove("active-drag");
    });

    monthSlider.addEventListener(
      "touchmove",
      (e) => {
        if (!isDown) return;
        const x = e.touches[0].pageX - monthSlider.offsetLeft;
        const walk = (x - startX) * 2;
        monthSlider.scrollLeft = scrollLeft - walk;
        updateScrollHints();
      },
      { passive: true }
    );
  }

  // 월별 버튼 생성 함수 수정
  function createMonthButtons(monthlyData) {
    // 기존 버튼 제거
    monthSlider.innerHTML = "";

    // 월 정렬 - 과거 월이 왼쪽, 최신 월이 오른쪽에 오도록 정렬 (오름차순)
    const months = Object.keys(monthlyData).sort(); // 오름차순 정렬 (2025.04, 2025.05, ...)

    // lastUpdatedInfo를 저장할 객체
    const monthUpdates = {};

    // 각 월별 last_updated 정보 저장
    rankingData.forEach((entry) => {
      if (entry._lastUpdated) {
        // 파일에서 추출한 last_updated 정보
        const dateInfo = parseDate(entry.updatedAt);
        if (dateInfo) {
          const monthKey = `${dateInfo.year}.${dateInfo.month}`;
          monthUpdates[monthKey] = entry._lastUpdated;
        }
      }
    });

    // 월별 버튼 생성
    months.forEach((month, index) => {
      const monthTag = document.createElement("div");
      // 마지막 항목(최신 월)이 기본 활성화
      monthTag.className =
        "month-tag" + (index === months.length - 1 ? " active" : "");
      monthTag.textContent = month;
      monthTag.dataset.month = month;

      monthTag.addEventListener("click", () => {
        // 모든 월 태그 비활성화
        document
          .querySelectorAll(".month-tag")
          .forEach((tag) => tag.classList.remove("active"));
        // 현재 선택한 태그 활성화
        monthTag.classList.add("active");
        // 해당 월 랭킹 표시
        displayRankings(monthlyData[month]);

        // 선택한 월의 last_updated 정보 표시
        if (monthUpdates[month]) {
          lastUpdate.textContent = `LAST UPDATE: ${monthUpdates[month]}`;
        }

        // 선택한 항목이 보이도록 스크롤 조정
        monthTag.scrollIntoView({
          behavior: "smooth",
          inline: "center",
        });
      });

      monthSlider.appendChild(monthTag);
    });

    // 스크롤 힌트와 드래그 기능 추가
    enhanceMonthSlider();

    // 마지막 월(최신 월) 데이터 표시 및 스크롤 위치 설정
    if (months.length > 0) {
      const latestMonth = months[months.length - 1]; // 마지막 항목(최신 월)
      displayRankings(monthlyData[latestMonth]);

      // 최신 월의 last_updated 정보 표시
      if (monthUpdates[latestMonth]) {
        lastUpdate.textContent = `LAST UPDATE: ${monthUpdates[latestMonth]}`;
      }

      // 마지막 월 버튼이 보이도록 스크롤 조정 (약간의 지연 후)
      setTimeout(() => {
        const activeTag = monthSlider.querySelector(".month-tag.active");
        if (activeTag) {
          activeTag.scrollIntoView({
            behavior: "auto",
            inline: "center",
          });
        }
      }, 100);
    } else {
      rankingsList.innerHTML = `<div class="no-data-message">${
        detectLanguage() === "ko"
          ? "랭킹 데이터가 없습니다."
          : "No ranking data available."
      }</div>`;
    }
  }

  // 랭킹 데이터 표시
  function displayRankings(data) {
    // 로딩 표시
    rankingsList.innerHTML = `<div class="loading">${
      detectLanguage() === "ko" ? "랭킹 데이터 로딩 중" : "Loading ranking data"
    }</div>`;

    setTimeout(() => {
      rankingsList.innerHTML = "";

      // 점수와 시간으로 정렬 (높은 점수 > 낮은 시간)
      const sortedData = [...data].sort((a, b) => {
        if (a.score !== b.score) {
          return b.score - a.score; // 높은 점수 우선
        }
        return a.elapsedMillis - b.elapsedMillis; // 같은 점수면 낮은 시간 우선
      });

      // 상위 20개만 표시
      const topEntries = sortedData.slice(0, 20);

      topEntries.forEach((entry, index) => {
        const rank = index + 1;
        const userId = entry.userId ? entry.userId.substring(0, 5) : "Unknown"; // 사용자 ID 앞 5자리만
        const score = entry.score;
        const dateInfo = entry.updatedAt
          ? parseDate(entry.updatedAt)
          : { formattedDate: "-" };

        // 랭킹 카드 생성
        const rankingCard = document.createElement("div");
        rankingCard.className = "ranking-card";

        // 순위에 따른 특별 스타일
        let rankClass = "rank";
        if (rank === 1) rankClass += " top-1";
        else if (rank === 2) rankClass += " top-2";
        else if (rank === 3) rankClass += " top-3";

        // 카드 내용
        rankingCard.innerHTML = `
                    <div class="${rankClass}">${rank}</div>
                    <div class="user-info">
                        <span class="lang-tag">${entry.language || "-"}</span>
                        <div class="user-id">${userId}</div>
                    </div>
                    <div class="stats">
                        <div class="score">${score}<span class="score-max">/10</span> <span class="time-small">${formatElapsedTime(
          entry.elapsedMillis
        )}</span></div>
                        <div class="date">${dateInfo.formattedDate}</div>
                    </div>
                `;

        rankingsList.appendChild(rankingCard);
      });

      // 상태 업데이트
      statusText.textContent =
        detectLanguage() === "ko" ? "연결됨" : "CONNECTED";
      statusText.style.color = "#0fa";
    }, 500); // 로딩 효과를 위한 지연
  }

  // 데이터 로드 시작
  loadAvailableMonths();
});

// 팝업을 표시할지 여부 결정 함수
function shouldShowPopup() {
  // 영구적으로 닫음
  const popupDismissed = localStorage.getItem("popupDismissed");
  if (popupDismissed === "true") return false;

  // 오늘 하루만 닫음
  const todayDismissed = localStorage.getItem("popupDismissedToday");
  if (todayDismissed) {
    const today = new Date().toDateString();
    if (todayDismissed === today) return false;
  }
  
  return true;
}