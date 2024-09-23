// 全局变量和常量
let utterance;
let isSpeaking = false;
let voices = [];
let queue = []; // 用于存储待播放的文本
let currentUtterance = null; // 当前正在播放的语音合成实例
let playPauseBtn = document.getElementById("playPauseBtn"); // 假设你有一个播放/暂停按钮
let toggleThemeBtn = document.getElementById("toggleThemeBtn");
let NewWords = [],
  NewWordMeans,
  matchWordsRegex;
const the_natural_voices = {
  "zh-CN": { male: "yunjian", female: "xiaoxiao" },
  "ja-JP": { male: "keita", female: "nanami" },
};

// 工具函数
function parseJSON(jsonString) {
  try {
    const parsedData = JSON.parse(jsonString);
    return parsedData; // 返回解析后的数据
  } catch (error) {
    console.error("JSON 解析出错:", error.message);
    return null; // 或者返回一个默认值，或者抛出一个自定义错误
  }
}
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
// 语音合成相关函数
function loadVoices() {
  return window.speechSynthesis.getVoices();
}
function readit(title) {
  // title && speak(title, 'zh-CN', 'female', true)
  const { readType } = getReadConfig();
  let queryStr = readType.trim() == "文章" ? "table.lession tr" : "#tab1 tr";
  const trs = document.querySelectorAll(queryStr);
  trs.forEach((tr) => {
    speak(tr.firstElementChild.textContent, "ja-JP", "male", true, tr);
  });
}

function speak(
  text,
  lang = "ja-JP",
  gender = "female",
  is_natural = true,
  element = null,
) {
  queue.push({ text, lang, gender, is_natural, element }); // 将文本添加到队列
  if (!isSpeaking) {
    playNext(); // 如果当前没有在播放，开始播放下一个
  }
}

function playNext() {
  if (queue.length === 0) {
    isSpeaking = false; // 队列为空，停止播放
    playPauseBtn.textContent = "🐬"; // 更改为播放图标
    return;
  }

  const { text, lang, gender, is_natural, element, passed, is_extra } =
    queue.shift(); // 从队列中取出下一个文本
  currentUtterance = new SpeechSynthesisUtterance(text);
  currentUtterance.lang = lang; // 设置语言种类
  let loopCount = 0;
  let rate = 1;
  let withTrans = false;
  let readType = "文章";
  if (!is_extra) {
    if (passed) {
      loopCount = passed.loopCount;
      rate = passed.rate;
      withTrans = passed.withTrans;
      readType = passed.readType;
    } else {
      const config = getReadConfig();
      loopCount = config.loopCount;
      rate = config.rate;
      withTrans = config.withTrans;
      readType = config.readType;
    }
  }
  // if (readType == "文章") {
  //   const jp_sentence = element.firstElementChild.textContent;
  //   jp_sentence && jpAnalyzer.setAttribute("data-text", jp_sentence);
  // }

  currentUtterance.rate = rate; // 设置播放语速

  if (voices.length === 0) voices = loadVoices();
  let _voices;

  if (is_natural) {
    const _voice_name = the_natural_voices[lang][gender];
    _voices = voices.filter(
      (voice) =>
        voice.lang === lang && voice.name.toLowerCase().includes("natural"),
    );
    const genderedVoice = _voices.filter((voice) =>
      voice.name.toLowerCase().includes(_voice_name),
    );
    if (genderedVoice.length > 0) _voices = genderedVoice;
  }

  let selectedVoice = (_voices || voices).find((voice) => voice.lang === lang);
  if (selectedVoice) {
    currentUtterance.voice = selectedVoice; // 设置选择的声音
  }

  currentUtterance.onend = () => {
    isSpeaking = false; // 当前播放结束
    element && element.classList.remove("speaking");

    if (loopCount > 1) {
      queue.unshift({
        text,
        lang,
        gender,
        is_natural,
        element,
        passed: { loopCount: loopCount - 1, rate, withTrans, readType },
      });
      playNext(); // 继续播放同一文本
    } else {
      if (withTrans && element?.lastElementChild) {
        const _T = element.lastElementChild.textContent;
        if (readType == "文章" && _T) {
          speechContainedWords(text).forEach((w) => {
            queue.unshift({ ...w, is_natural, element, is_extra: true });
          });
        }
        _T &&
          queue.unshift({
            text: element.lastElementChild.textContent,
            lang: "zh-CN",
            gender: "male",
            is_natural,
            element,
            is_extra: true,
          });
      }
      playNext();
    }
  };

  currentUtterance.onerror = (event) => {
    console.error("语音合成出错:", event.error);
    isSpeaking = false; // 发生错误，停止播放
    element && element.classList.remove("speaking");
    playNext();
  };

  window.speechSynthesis.speak(currentUtterance);
  isSpeaking = true; // 设置为正在播放
  playPauseBtn.textContent = "🐳"; // 更改为暂停图标
  element && element.classList.add("speaking");
}

function getReadConfig() {
  const readType = document.querySelector("#read-type-btn").textContent;
  const rate = document
    .querySelector("#speech-rate-btn")
    .textContent.replaceAll("x", "")
    .replaceAll("倍速", "");
  const loopCount = document
    .querySelector("#speech-loop-number-btn")
    .textContent.replaceAll("重复", "")
    .replaceAll("次", "");
  const withTrans = document.querySelector("#with-translate-btn").textContent;
  const loop = document.querySelector("#loop-btn").textContent;

  return { readType, rate, loopCount, withTrans, loop };
}

function speechContainedWords(text) {
  if (!NewWords) return [];
  if (!matchWordsRegex)
    matchWordsRegex = new RegExp(`(${NewWords.join("|")})`, "gi");
  const matches = text.match(matchWordsRegex);
  let result = matches ? [...new Set(matches)] : [];
  return result
    .map((word) => {
      const index = NewWords.indexOf(word);
      if (NewWordMeans && NewWordMeans[index]) {
        return [
          { text: NewWordMeans[index], lang: "zh-CN" },
          { text: word, lang: "ja-JP" },
          { text: "本章单词:", lang: "zh-CN", gender: "female" },
        ];
      } else {
        return [
          { text: word, lang: "ja-JP" },
          { text: "本章单词:", lang: "zh-CN", gender: "female" },
        ];
      }
    })
    .flat();
}

// UI 相关函数
function showTab(tabId) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });

  document.getElementById(tabId).classList.add("active");
  document.getElementById(tabId + "-btn").classList.add("active");
}

function getWords(index) {
  const url = "/Japanese-learning/lessions/vocabulary.md";
  return getMDContent(url, index);
}
function getMDContent(url, index = 0) {
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("网络响应失败");
      }
      return response.text();
    })
    .then((markdown) => {
      const match = markdown.split(/## 第\d?\d课/)[index] || "";
      return markdownToHtmlTable(match);
    });
}

function markdownToHtmlTable(markdownStr) {
  const rows = markdownStr
    .trim()
    .split("\n")
    .filter((row) => row.trim() !== "" && row.includes("|"));
  let html = '<table border="1" class="regular">\n';

  rows.forEach((row, index) => {
    const columns = row
      .split("|")
      .map((col) => col.trim())
      .filter((col) => col);

    if (index === 0) {
      html += "  <tr>\n";
      columns.forEach((col) => {
        html += `    <td>${col}</td>\n`;
      });
      html += "  </tr>\n";
    } else {
      html += "  <tr>\n";
      columns.forEach((col) => {
        html += `    <td>${col}</td>\n`;
      });
      html += "  </tr>\n";
    }
  });
  html += "</table>";
  return html;
}

// 应用启动函数
export default function startApp(chatModule) {
  const playPauseBtn = document.getElementById("playPauseBtn");
  const chatOutput = document.getElementById("chat-output");
  const leftContentId = "left-content";
  const leftcontent = document.querySelector(".lession-layout .content");
  leftcontent ? (leftcontent.id = leftContentId) : null;

  let content = "";
  voices = loadVoices();
  // window.speechSynthesis.onvoiceschanged = loadVoices;

  const title = "";
  const url = decodeURIComponent(window.location.href);

  document.querySelectorAll("table").forEach((t, i) => {
    t && t.classList.add("lession");
    i < 2 && t.classList.add("basic");
    i >= 1 && t.classList.add("conversation");
  });
  const trs = document.querySelectorAll("table.lession tr");
  const translates = "";
  trs.forEach((t) => {
    let clickTimeout;
    content += t.firstElementChild.textContent;

    //translates += t.lastElementChild.textContent
    t.classList.add("lession-item");
    t.lastElementChild.classList.add("hidden", "last");
    t.addEventListener("click", (e) => {
      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        const text = t.firstElementChild.textContent;
        speak(t.firstElementChild.textContent, "ja-JP", "male", true);
        // text && jpAnalyzer.setAttribute("data-text", text);
      }, 250);
    });
    t.addEventListener("dblclick", async (e) => {
      clearTimeout(clickTimeout); // 清除 click 的定时器，防止 click 事件被触发
      const text = t.firstElementChild.textContent;
      t.lastElementChild.classList.toggle("hidden");
      setTimeout(() => t.lastElementChild.classList.toggle("hidden"), 1500);
    });
  });

  getWords(index).then((results) => {
    document.querySelector("#mobile-words").innerHTML = results;
    NewWords = Array.from(
      document.querySelectorAll("#tab1 tr td:first-child"),
    ).map((td) => td.textContent);
    NewWordMeans = Array.from(
      document.querySelectorAll("#tab1 tr td:last-child"),
    ).map((td) => td.textContent);
    matchWordsRegex = new RegExp(`(${NewWords.join("|")})`, "gi");
  });

  playPauseBtn.addEventListener("click", () => {
    if (isSpeaking) {
      window.speechSynthesis.pause();
      playPauseBtn.textContent = "🐬"; // 更改为播放图标
      isSpeaking = false;
    } else {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
        playPauseBtn.textContent = "🐳"; // 更改为暂停图标
        isSpeaking = true;
      } else {
        readit(title);
      }
    }
  });
  toggleThemeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    if (document.body.classList.contains("dark-theme")) {
      toggleThemeBtn.textContent = "🌛";
      //其他需要调整的
    } else {
      toggleThemeBtn.textContent = "🌞";
      //其他需要调整的
    }
  });

  document.querySelectorAll("button.range").forEach((btn) => {
    let range = btn.getAttribute("range");
    let rangeIndex = btn.getAttribute("range-index") || 0;
    range = parseJSON(range);
    if (!range) return;
    let rangeLength = range.length;
    rangeIndex = Number(rangeIndex);
    btn.addEventListener("click", (e) => {
      rangeIndex + 1 >= rangeLength ? (rangeIndex = 0) : rangeIndex++;
      btn.setAttribute("range-index", rangeIndex);
      if (btn.id == "speech-rate-btn") {
        btn.textContent = range[rangeIndex] + "倍速";
      } else if (btn.id == "speech-loop-number-btn") {
        btn.textContent = "重复" + range[rangeIndex] + "次";
      } else {
        btn.textContent = range[rangeIndex];
      }
    });
  });
}
