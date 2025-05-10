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
    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    
    // 파일명 형식 생성 (YYMM)
    const defaultFileName = `${currentYear.toString().substring(2)}${currentMonth}`;
    
    // 텍스트 파일에서 데이터 가져오기
    function fetchRankingData(fileName = defaultFileName) {
        statusText.textContent = detectLanguage() === 'ko' ? '데이터 로딩 중...' : 'LOADING DATA...';
        statusText.style.color = '#0fa';
        
        // 파일 경로 - 상대 경로 사용
        const filePath = `./${fileName}.txt`;
        console.log(`파일 로드 시도: ${filePath}`);
        
        // XMLHttpRequest 사용 (로컬 환경에서 더 잘 작동)
        const xhr = new XMLHttpRequest();
        xhr.open('GET', filePath, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    console.log(`파일 내용 가져옴: ${xhr.responseText.length} 바이트`);
                    processRankingData(xhr.responseText);
                } else {
                    console.error(`파일을 불러올 수 없습니다: ${xhr.status}`);
                    // 2505 파일이 아닌 경우 2505로 다시 시도
                    if (fileName !== '2505') {
                        console.log('기본 데이터(2505)로 다시 시도합니다.');
                        setTimeout(() => fetchRankingData('2505'), 1000);
                    } else {
                        // 2505도 실패하면 하드코딩된 데이터 사용
                        useHardcodedData();
                    }
                }
            }
        };
        xhr.send();
    }
    
    // 하드코딩된 데이터 사용 (모든 로드 방법이 실패할 경우)
    function useHardcodedData() {
        console.log("하드코딩된 데이터를 사용합니다.");
        statusText.textContent = detectLanguage() === 'ko' ? '하드코딩 데이터 사용' : 'USING HARDCODED DATA';
        statusText.style.color = '#f90';
        
        // 250509_2127.txt의 데이터 직접 사용
        const sampleData = `
Document ID\telapsedMillis\tlanguage\tmode\tscore\tupdatedAt\tuserId
OY5osZpagrJVgkV3z5uf_normal\t17000\t"ko"\t"normal"\t9\t2025년 5월 7일 오후 1시 4분 9초 UTC+9\t"OY5osZpagrJVgkV3z5uf"
t8ofnf18qmzCQICpewMv_normal\t24950\t"ko"\t"normal"\t9\t2025년 5월 9일 오후 8시 53분 27초 UTC+9\t"t8ofnf18qmzCQICpewMv"
JbNc2iozV6S7o5yusxLg_normal\t42480\t"ko"\t"normal"\t9\t2025년 5월 7일 오후 11시 3분 59초 UTC+9\t"JbNc2iozV6S7o5yusxLg"
44uVRp7PcQyyowenKHT8_normal\t13600\t"en"\t"normal"\t8\t2025년 4월 30일 오후 10시 44분 50초 UTC+9\t"44uVRp7PcQyyowenKHT8"
mvtcW0QlXMsUKQPQcqos_normal\t17010\t"ko"\t"normal"\t8\t2025년 5월 7일 오전 11시 2분 14초 UTC+9\t"mvtcW0QlXMsUKQPQcqos"
BQLOQRjmqOdXO7GFRQWI_normal\t17250\t"ko"\t"normal"\t8\t2025년 5월 7일 오후 6시 44분 41초 UTC+9\t"BQLOQRjmqOdXO7GFRQWI"
dbxpp2hn8wqeTIBGvP7c_normal\t19270\t"ko"\t"normal"\t8\t2025년 5월 7일 오전 1시 52분 19초 UTC+9\t"dbxpp2hn8wqeTIBGvP7c"
rgwnvuD6UMmL8Onbx2ZC_normal\t21630\t"ko"\t"normal"\t8\t2025년 5월 7일 오전 8시 8분 32초 UTC+9\t"rgwnvuD6UMmL8Onbx2ZC"
l0wyODHAlO93oYPnaZbF_normal\t22510\t"ko"\t"normal"\t8\t2025년 5월 7일 오전 12시 25분 54초 UTC+9\t"l0wyODHAlO93oYPnaZbF"
yT2x445TaOlhxjOEb0mE_normal\t24270\t"ko"\t"normal"\t8\t2025년 5월 8일 오전 11시 14분 11초 UTC+9\t"yT2x445TaOlhxjOEb0mE"
KeuywF0w2DH6j3X1Unxn_normal\t27090\t"ko"\t"normal"\t8\t2025년 5월 7일 오전 2시 13분 39초 UTC+9\t"KeuywF0w2DH6j3X1Unxn"
2OmS6VnPodxCKRedo2cS_normal\t28210\t"ko"\t"normal"\t8\t2025년 5월 5일 오후 8시 50분 2초 UTC+9\t"2OmS6VnPodxCKRedo2cS"
d9hkwVzQIpNSel1fqOQY_normal\t41530\t"ko"\t"normal"\t8\t2025년 4월 30일 오전 1시 19분 58초 UTC+9\t"d9hkwVzQIpNSel1fqOQY"
Xg5ILbbxDNYrDElx2G4v_normal\t47560\t"ko"\t"normal"\t8\t2025년 5월 5일 오후 10시 31분 36초 UTC+9\t"Xg5ILbbxDNYrDElx2G4v"
HEBmp8RHgTs7hhR9LgSG_normal\t14650\t"ko"\t"normal"\t7\t2025년 4월 30일 오후 11시 12분 30초 UTC+9\t"HEBmp8RHgTs7hhR9LgSG"
4zRmTyC1z9jggcyIyrn4_normal\t16930\t"ko"\t"normal"\t7\t2025년 5월 6일 오후 12시 44분 56초 UTC+9\t"4zRmTyC1z9jggcyIyrn4"
xHYfyCqscmQFyD2lRTFP_normal\t21140\t"ko"\t"normal"\t7\t2025년 5월 6일 오후 1시 36분 14초 UTC+9\t"xHYfyCqscmQFyD2lRTFP"
zfFnJTLNy3FkRfTV2SFt_normal\t30690\t"ko"\t"normal"\t7\t2025년 5월 6일 오전 10시 14분 14초 UTC+9\t"zfFnJTLNy3FkRfTV2SFt"
MJi4aomPuI7CVBZsNsIn_normal\t32160\t"ko"\t"normal"\t7\t2025년 5월 5일 오후 9시 29분 49초 UTC+9\t"MJi4aomPuI7CVBZsNsIn"
FTAyKyakGaVOskUy1U5x_normal\t24000\t"ko"\t"normal"\t6\t2025년 4월 30일 오전 11시 54분 34초 UTC+9\t"FTAyKyakGaVOskUy1U5x"
`;
        
        processRankingData(sampleData);
    }
    
    // 데이터 처리 함수
    function processRankingData(text) {
        try {
            // 텍스트 파싱
            // 줄바꿈으로 분리 (다양한 줄바꿈 문자 지원)
            const lines = text.split(/\r?\n/).filter(line => {
                // 빈 줄이나 주석, 세미콜론으로 시작하는 줄 제외
                return line.trim() !== '' && !line.startsWith('//') && !line.startsWith(';');
            });
            
            // 첫 번째 유효한 줄은 헤더로 간주
            if (lines.length === 0) {
                throw new Error('파일에 유효한 데이터가 없습니다.');
            }
            
            console.log(`파싱된 라인 수: ${lines.length}`);
            console.log(`헤더: ${lines[0]}`);
            
            // 헤더 추출 (첫 번째 줄의 탭으로 구분된 값들)
            const headers = lines[0].split('\t').map(header => header.trim());
            
            // 기존 데이터 초기화
            rankingData = [];
            
            // 첫 번째 줄은 헤더이므로 제외하고 데이터 행만 파싱
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // 탭으로 구분된 값 추출
                const values = line.split('\t');
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
                        if (!isNaN(value) && value !== '') {
                            entry[header] = Number(value);
                        } else {
                            entry[header] = value;
                        }
                    }
                });
                
                // 모든 필수 필드가 있는 경우만 추가
                if (entry.score !== undefined && 
                    entry.elapsedMillis !== undefined && 
                    entry.updatedAt !== undefined && 
                    entry.userId !== undefined) {
                    rankingData.push(entry);
                }
            }
            
            console.log(`${rankingData.length}개의 랭킹 데이터를 로드했습니다.`);
            
            // 데이터 그룹화 및 월별 버튼 생성
            const monthlyData = groupDataByMonth();
            createMonthButtons(monthlyData);
            
            statusText.textContent = detectLanguage() === 'ko' ? '연결됨' : 'CONNECTED';
            statusText.style.color = '#0fa';
            
        } catch (error) {
            console.error("데이터 처리 오류:", error);
            statusText.textContent = detectLanguage() === 'ko' ? '오류 발생' : 'ERROR';
            statusText.style.color = '#f55';
            rankingsList.innerHTML = `<div class="error-message">${detectLanguage() === 'ko' ? '데이터를 처리하는 중 오류가 발생했습니다.' : 'An error occurred while processing the data.'}</div>`;
            
            // 오류 발생 시 하드코딩된 데이터 사용
            useHardcodedData();
        }
    }
    
    // 사용 가능한 월별 파일 목록 로딩 (간소화 버전)
    function loadAvailableMonths() {
        // 서버에서의 파일 존재 여부 확인은 어렵기 때문에
        // 현재 알려진 파일들을 직접 시도합니다
        const knownFiles = ['2505', '2504'];
        
        // 가장 최신 파일(2505)로 시작
        fetchRankingData(knownFiles[0]);
    }
    
    // 언어 감지 및 설정
    function detectLanguage() {
        const languages = navigator.languages || [navigator.language || navigator.userLanguage];
        const preferredLang = languages[0].toLowerCase();
        return preferredLang.startsWith('ko') ? 'ko' : 'en';
    }
    
    // 언어 변경 함수
    function updateLanguage() {
        const lang = detectLanguage();
        
        // HTML lang 속성 변경
        document.documentElement.lang = lang;
        
        // 모든 다국어 요소 업데이트
        document.querySelectorAll(`[data-lang-${lang}]`).forEach(element => {
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
        
        let result = '';
        
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
                    formattedDate: "2025/05/01 00:00:00" 
                }; // 기본값 반환
            }
            
            const year = yearMatch[1];
            const month = monthMatch[1].padStart(2, '0');
            const day = dayMatch[1].padStart(2, '0');
            
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
            const formattedHours = hours.toString().padStart(2, '0');
            const formattedMinutes = minutes.toString().padStart(2, '0');
            const formattedSeconds = seconds.toString().padStart(2, '0');
            
            // yyyy/MM/dd HH:mm:ss 형식으로 변환
            const formattedDate = `${year}/${month}/${day} ${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
            
            return { 
                year, 
                month, 
                day,
                hours: formattedHours,
                minutes: formattedMinutes,
                seconds: formattedSeconds,
                formattedDate
            };
        } catch (error) {
            console.error("날짜 파싱 오류:", error);
            return { 
                year: "2025", 
                month: "05", 
                day: "01",
                formattedDate: "2025/05/01 00:00:00" 
            }; // 오류 시 기본값
        }
    }
    
    // 월별 데이터 그룹화
    function groupDataByMonth() {
        const monthlyData = {};
        
        rankingData.forEach(item => {
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
    
    // 월별 버튼 생성
    function createMonthButtons(monthlyData) {
        // 기존 버튼 제거
        monthSlider.innerHTML = '';
        
        const months = Object.keys(monthlyData).sort().reverse(); // 최신 월이 먼저 오도록
        
        months.forEach((month, index) => {
            const monthTag = document.createElement('div');
            monthTag.className = 'month-tag' + (index === 0 ? ' active' : '');
            monthTag.textContent = month;
            monthTag.dataset.month = month;
            
            monthTag.addEventListener('click', () => {
                // 모든 월 태그 비활성화
                document.querySelectorAll('.month-tag').forEach(tag => tag.classList.remove('active'));
                // 현재 선택한 태그 활성화
                monthTag.classList.add('active');
                // 해당 월 랭킹 표시
                displayRankings(monthlyData[month]);
            });
            
            monthSlider.appendChild(monthTag);
        });
        
        // 첫 번째 월 데이터 표시 (최신 월)
        if (months.length > 0) {
            displayRankings(monthlyData[months[0]]);
        } else {
            rankingsList.innerHTML = `<div class="no-data-message">${detectLanguage() === 'ko' ? '랭킹 데이터가 없습니다.' : 'No ranking data available.'}</div>`;
        }
    }
    
    // 랭킹 데이터 표시
    function displayRankings(data) {
        // 로딩 표시
        rankingsList.innerHTML = `<div class="loading">${detectLanguage() === 'ko' ? '랭킹 데이터 로딩 중' : 'Loading ranking data'}</div>`;
        
        setTimeout(() => {
            rankingsList.innerHTML = '';
            
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
                const userId = entry.userId ? entry.userId.substring(0, 5) : 'Unknown'; // 사용자 ID 앞 5자리만
                const score = entry.score;
                const dateInfo = entry.updatedAt ? parseDate(entry.updatedAt) : { formattedDate: "-" };
                
                // 랭킹 카드 생성
                const rankingCard = document.createElement('div');
                rankingCard.className = 'ranking-card';
                
                // 순위에 따른 특별 스타일
                let rankClass = 'rank';
                if (rank === 1) rankClass += ' top-1';
                else if (rank === 2) rankClass += ' top-2';
                else if (rank === 3) rankClass += ' top-3';
                
                // 카드 내용
                rankingCard.innerHTML = `
                    <div class="${rankClass}">${rank}</div>
                    <div class="user-info">
                        <span class="lang-tag">${entry.language || '-'}</span>
                        <div class="user-id">${userId}</div>
                    </div>
                    <div class="stats">
                        <div class="score">${score}<span class="score-max">/10</span> <span class="time-small">${formatElapsedTime(entry.elapsedMillis)}</span></div>
                        <div class="date">${dateInfo.formattedDate}</div>
                    </div>
                `;
                
                rankingsList.appendChild(rankingCard);
            });
            
            // 상태 업데이트
            statusText.textContent = detectLanguage() === 'ko' ? '연결됨' : 'CONNECTED';
            statusText.style.color = '#0fa';
            
            // 마지막 업데이트 시간
            const now = new Date();
            lastUpdate.textContent = `LAST UPDATE: ${now.toLocaleTimeString()}`;
        }, 500); // 로딩 효과를 위한 지연
    }
    
    // 데이터 로드 시작
    loadAvailableMonths();
});