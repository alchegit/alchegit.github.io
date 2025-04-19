/* 
 * 스타일 출처: NeoKIM의 사이버펑크 테마 기반
 * 스타일 복사일: 2025년 4월 19일
 * 원본 링크: https://codepen.io/Marcus-Moen-the-builder/pen/vEEBRZY
 * 
 * 이 스타일시트의 디자인은 위 링크의 작업물을 기반으로 하고 있습니다.
 * 모든 저작권은 원 저작자에게 있습니다.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 모바일 환경 감지 및 클래스 추가
    function checkMobile() {
        if (window.innerWidth <= 768) {
            document.documentElement.classList.add('mobile-view');
        } else {
            document.documentElement.classList.remove('mobile-view');
        }
    }

    // 초기 체크 및 리사이즈 이벤트에 바인딩
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Show modal on page load using Bootstrap
    const welcomeModal = new bootstrap.Modal(document.getElementById('welcomeModal'), {
        backdrop: 'static',
        keyboard: false
    });
    welcomeModal.show();

    // 브라우저 언어 감지 및 설정
    function detectLanguage() {
        const userLang = navigator.language || navigator.userLanguage;
        const preferredLang = userLang.toLowerCase().startsWith('ko') ? 'ko' : 'en';
        document.documentElement.lang = preferredLang;
        return preferredLang;
    }

    // Language handling
    function updateLanguage() {
        const lang = detectLanguage();
        
        // Update title
        document.title = document.querySelector('title').getAttribute(`data-lang-${lang}`);

        // Update all elements with data-lang attributes
        document.querySelectorAll(`[data-lang-${lang}]`).forEach(element => {
            element.textContent = element.getAttribute(`data-lang-${lang}`);
        });

        // Update image alt texts
        document.querySelectorAll('img').forEach(img => {
            const altText = img.getAttribute(`data-lang-${lang}-alt`);
            if (altText) {
                img.alt = altText;
            }
        });
    }

    // Initial language update
    updateLanguage();

	const cards = document.querySelectorAll(".cyber-card");
	const cardGlows = document.querySelectorAll(".card-glow");
	const instabilityCounter = document.getElementById("instability-counter");

	let instability = 0;
	let hoverTime = 0;
	let hoverInterval;
	let glitchInterval;
	let secretCode = "";
	let secretTimeout;

	// Color palettes for different cards
	const glowColors = [
		[
			"rgba(0, 255, 170, 0.7)",
			"rgba(0, 170, 255, 0.7)",
			"rgba(170, 255, 0, 0.7)"
		], // Card 1
		[
			"rgba(0, 170, 255, 0.7)",
			"rgba(170, 0, 255, 0.7)",
			"rgba(255, 170, 0, 0.7)"
		], // Card 2
		["rgba(255, 0, 0, 0.7)", "rgba(255, 0, 170, 0.7)", "rgba(255, 170, 0, 0.7)"] // Card 3
	];

	// Initialize random glitch effects
	startRandomGlitches();

	// Increase instability over time
	if (instabilityCounter) {
		setInterval(() => {
			if (instability < 100) {
				instability += 0.1;
				updateInstability();
			}

			// Random system glitches at high instability
			if (instability > 70 && Math.random() > 0.97) {
				triggerSystemGlitch();
			}
		}, 1000);
	}

	// Mouse move effect for all cards
	document.addEventListener("mousemove", (e) => {
		cards.forEach((card, index) => {
			const rect = card.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			// Only apply effect if mouse is within 300px of the card
			const distance = Math.sqrt(
				Math.pow(x - rect.width / 2, 2) + Math.pow(y - rect.height / 2, 2)
			);

			if (distance < 300) {
				const intensity = 1 - distance / 300;
				updateCardGlow(card, x, y, intensity);
			}
		});
	});

	// Scroll effect
	window.addEventListener("scroll", () => {
		const scrollPercentage =
			window.scrollY / (document.body.scrollHeight - window.innerHeight);

		cards.forEach((card, index) => {
			const cardGlow = card.querySelector(".card-glow");
			const baseColor = glowColors[index % glowColors.length][0];
			const scrollColor = glowColors[index % glowColors.length][1];

			// Mix colors based on scroll position
			const mixedColor = mixColors(baseColor, scrollColor, scrollPercentage);

			// Apply the mixed color with increased intensity on scroll
			cardGlow.style.background = `radial-gradient(circle, ${mixedColor} 0%, transparent ${
				70 - scrollPercentage * 20
			}%)`;

			// Add slight rotation based on scroll
			card.style.transform = `rotateX(${scrollPercentage * 5}deg) rotateY(${
				scrollPercentage * 5
			}deg)`;
		});
	});

	// Card hover effects
	cards.forEach((card, index) => {
		card.addEventListener("mouseenter", () => {
			// Reset hover timer
			hoverTime = 0;

			// Start hover timer
			hoverInterval = setInterval(() => {
				hoverTime += 100;
			}, 100);

			// Increase instability slightly on hover
			instability += 1;
			updateInstability();

			// Enhance glow on hover
			const cardGlow = card.querySelector(".card-glow");
			const currentColor = glowColors[index % glowColors.length][0];
			cardGlow.style.filter = "blur(20px)";
			cardGlow.style.opacity = "0.9";

			// Add glitch text effect to card title
			const cardTitle = card.querySelector(".card-title");
			cardTitle.classList.add("glitch-text");
			cardTitle.setAttribute("data-text", cardTitle.textContent);
		});

		card.addEventListener("mouseleave", () => {
			clearInterval(hoverInterval);

			

			// Reset glow
			const cardGlow = card.querySelector(".card-glow");
			cardGlow.style.filter = "blur(15px)";
			cardGlow.style.opacity = "0.7";

			// Remove glitch text effect
			const cardTitle = card.querySelector(".card-title");
			cardTitle.classList.remove("glitch-text");
		});
	});

	// Secret keyboard combo detection
	document.addEventListener("keydown", (e) => {
		secretCode += e.key;

		// Check for "cyber" sequence
		if (secretCode.includes("cyber")) {
			triggerSecretMode();
			secretCode = "";
		}

		// Reset after 2 seconds of no input
		clearTimeout(secretTimeout);
		secretTimeout = setTimeout(() => {
			secretCode = "";
		}, 2000);
	});

	// Functions

	function updateCardGlow(card, x, y, intensity) {
		const cardIndex = parseInt(card.getAttribute("data-card-id")) - 1;
		const cardGlow = card.querySelector(".card-glow");
		const rect = card.getBoundingClientRect();

		// Calculate position relative to card center
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;

		// Calculate angle from center to mouse
		const angle = Math.atan2(y - centerY, x - centerX);

		// Calculate distance from center (normalized)
		const distance = Math.min(
			1,
			Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) /
				(rect.width / 2)
		);

		// Get colors based on card index
		const colorPalette = glowColors[cardIndex % glowColors.length];

		// Mix colors based on angle
		const angleNormalized = (angle + Math.PI) / (2 * Math.PI);
		const colorIndex1 = Math.floor(angleNormalized * colorPalette.length);
		const colorIndex2 = (colorIndex1 + 1) % colorPalette.length;
		const colorMixFactor = angleNormalized * colorPalette.length - colorIndex1;

		const color1 = colorPalette[colorIndex1];
		const color2 = colorPalette[colorIndex2];
		const mixedColor = mixColors(color1, color2, colorMixFactor);

		// Apply radial gradient with position based on mouse
		const posX = (x / rect.width) * 100;
		const posY = (y / rect.height) * 100;

		// Adjust gradient size based on distance and intensity
		const gradientSize = 70 - distance * 20 - intensity * 20;

		cardGlow.style.background = `radial-gradient(circle at ${posX}% ${posY}%, ${mixedColor} 0%, transparent ${gradientSize}%)`;

		// Add subtle transform based on mouse position
		const rotateY = ((x - centerX) / centerX) * 5 * intensity;
		const rotateX = ((y - centerY) / centerY) * 5 * intensity;

		card.style.transform = `rotateY(${rotateY}deg) rotateX(${-rotateX}deg)`;
	}

	function mixColors(color1, color2, factor) {
		// Parse rgba colors
		const parseColor = (color) => {
			const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
			if (match) {
				return {
					r: parseInt(match[1]),
					g: parseInt(match[2]),
					b: parseInt(match[3]),
					a: parseFloat(match[4])
				};
			}
			return { r: 0, g: 0, b: 0, a: 0 };
		};

		const c1 = parseColor(color1);
		const c2 = parseColor(color2);

		// Mix the colors
		const r = Math.round(c1.r + factor * (c2.r - c1.r));
		const g = Math.round(c1.g + factor * (c2.g - c1.g));
		const b = Math.round(c1.b + factor * (c2.b - c1.b));
		const a = c1.a + factor * (c2.a - c1.a);

		return `rgba(${r}, ${g}, ${b}, ${a})`;
	}

	function updateInstability() {
		if (instabilityCounter) {
			instabilityCounter.textContent = `${Math.min(100, Math.floor(instability))}%`;

			// Visual effects based on instability
			const warningElement = document.querySelector(".terminal-warning");
			if (warningElement) {
				if (instability > 80) {
					warningElement.style.color = "#f00";
					warningElement.style.textShadow = "0 0 5px #f00";
				} else if (instability > 50) {
					warningElement.style.color = "#ff0";
					warningElement.style.textShadow = "0 0 5px #ff0";
				}
			}
		}
	}

	function triggerOverload(card) {
        // Play glitch sound
        playGlitchSound();

        // Visual glitch effect
        const cardGlow = card.querySelector(".card-glow");
        cardGlow.style.filter = "blur(25px)";
        cardGlow.style.opacity = "1";

        setTimeout(() => {
            cardGlow.style.filter = "blur(15px)";
            cardGlow.style.opacity = "0.7";
        }, 500);
    }

	function triggerSystemGlitch() {
		// Visual glitch effect on the entire page
		const body = document.body;
		body.style.filter = "hue-rotate(90deg) brightness(1.2)";

		// Random card overloads
		cards.forEach((card) => {
			if (Math.random() > 0.7) {
				triggerOverload(card);
			}
		});

		// Reset after short delay
		setTimeout(() => {
			body.style.filter = "";
		}, 500);
	}

	function triggerSecretMode() {
		// Visual indication
		document.querySelector(".cyber-background").style.backgroundColor = "#100510";
		document.querySelector(".grid-overlay").style.backgroundImage =
			"linear-gradient(to right, rgba(255, 0, 255, 0.1) 1px, transparent 1px), " +
			"linear-gradient(to bottom, rgba(255, 0, 255, 0.1) 1px, transparent 1px)";

		// Change all card glows to a secret color
		cards.forEach((card) => {
			const cardGlow = card.querySelector(".card-glow");
			cardGlow.style.background =
				"radial-gradient(circle, rgba(255, 0, 255, 0.7) 0%, transparent 50%)";
			cardGlow.style.filter = "blur(25px)";
			cardGlow.style.opacity = "1";

			// Add special class for additional effects
			card.classList.add("secret-mode");
		});

		// Update terminal
		document.querySelector(".terminal-title").textContent =
			"SYSTEM://ADMIN_MODE_UNLOCKED";
		document.querySelector(".status-text").textContent = "SECURITY BYPASSED";

		// Reset after 10 seconds
		setTimeout(() => {
			document.querySelector(".cyber-background").style.backgroundColor = "";
			document.querySelector(".grid-overlay").style.backgroundImage = "";

			cards.forEach((card) => {
				card.classList.remove("secret-mode");
			});

			document.querySelector(".terminal-title").textContent =
				"SYSTEM://UNSTABLE_ARTIFACTS";
			document.querySelector(".status-text").textContent = "ANOMALY DETECTED";
		}, 10000);
	}

	function startRandomGlitches() {
		// Random glitch effects on cards
		glitchInterval = setInterval(() => {
			cards.forEach((card, index) => {
				// Random chance to trigger glitch effect
				if (Math.random() > 0.9) {
					const cardGlow = card.querySelector(".card-glow");
					const glitchDuration = 200 + Math.random() * 300;

					// Random color from palette
					const colorIndex = Math.floor(
						Math.random() * glowColors[index % glowColors.length].length
					);
					const glitchColor = glowColors[index % glowColors.length][colorIndex];

					// Apply glitch effect
					cardGlow.style.background = `radial-gradient(circle, ${glitchColor} 0%, transparent 60%)`;
					cardGlow.style.filter = "blur(25px)";
					cardGlow.style.opacity = "1";

					// Reset after short duration
					setTimeout(() => {
						const baseColor = glowColors[index % glowColors.length][0];
						cardGlow.style.background = `radial-gradient(circle, ${baseColor} 0%, transparent 70%)`;
						cardGlow.style.filter = "blur(15px)";
						cardGlow.style.opacity = "0.7";
					}, glitchDuration);
				}
			});
		}, 2000);
	}

	function playGlitchSound() {
		// Create audio context
		const audioContext = new (window.AudioContext || window.webkitAudioContext)();

		// Create oscillator
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		// Connect nodes
		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		// Set parameters
		oscillator.type = "sawtooth";
		oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(
			880,
			audioContext.currentTime + 0.1
		);

		gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
		gainNode.gain.exponentialRampToValueAtTime(
			0.01,
			audioContext.currentTime + 0.2
		);

		// Play and stop
		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.2);
	}
});
