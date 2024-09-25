const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const index = decodeURIComponent(urlParams.get("index"));
const lessionUrl = decodeURIComponent(urlParams.get("lession"));
const jpAnalyzer = document.querySelector("my-jp-analyzer")
let NewWords = []
let NewWordMeans
let matchWordsRegex;
let chatModule = null

let utterance;
let isSpeaking = false;
let voices = [];
let queue = []; // 用于存储待播放的文本
let currentUtterance = null; // 当前正在播放的语音合成实例'

const the_natural_voices = {
    "zh-CN": { male: "yunjian", female: "xiaoxiao" },
    "ja-JP": { male: "keita", female: "nanami" },
  };
  

function getWords(index) {
    const url = "/Japanese-learning/lessions/vocabulary.md";
    return getMDContent(url, "vocabulary", index);
}


function getMDContent(url, type = "lession", index = 1) {
    return fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error("网络响应失败");
            }
            return response.text();
        })
        .then((markdown) => {
            let match = markdown.split(/## 第\d?\d课/)[index] || "";
            if(type == "lession"){
                match = match.split("\n\n") || [];
                return result = match
                    .filter((t) => Boolean(t.trim()))
                    .map((t) => {
                        return markdownToHtmlTable(t, type);
                    })
                    .join("");
            } else {
                return markdownToHtmlTable(match,type);
            }
        });
}

function markdownToHtmlTable(markdownStr, type) {
    const rows = markdownStr
        .trim()
        .split("\n")
        .filter((row) => row.trim() !== "" && row.includes("|"));
    // let html = '<table border="1" class="regular">\n';
    let html = `<table class="${(type = "lession" ? "lession" : "regular")}">\n`;

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


  
async function ask(container, sentence, chatModule) {
    if (!sentence || !container) return;
    const id = "s-" + (await hashString(sentence));
    const exist = container.querySelector("#" + id);
    if (!exist) {
      const item = document.createElement("p");
      item.classList.add("answser");
      item.id = id;
      item.innerHTML = "<h2>";
      container.appendChild(item);
      chatModule.chat(null, sentence, id);
    } else {
      exist.scrollIntoView({ behavior: "smooth", block: "start" });
      exist.classList.add("shake");
      exist.addEventListener(
        "animationend",
        () => {
          exist.classList.remove("shake");
        },
        { once: true },
      ); // 只在动画结束时执行一次
    }
  }


  // 语音合成相关函数
function loadVoices() {
    return window.speechSynthesis.getVoices();
  }


  function readit() {
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
  function getReadConfig() {
    const readType = document.querySelector("#read-type-btn").textContent.replace(/\s/g,'');
    const rate = Number(document
      .querySelector("#speech-rate-btn")
      .textContent.replace("x", "")
      .replaceAll("倍速", "").replace(/\s/g,''));
    const loopCount = Number(document
      .querySelector("#speech-loop-number-btn")
      .textContent.replace("重复", "")
      .replace("次", "").replace(/\s/g,''));
    const withTrans = document.querySelector("#with-translate-btn").textContent.replace(/\s/g,'');
    const loop = document.querySelector("#loop-btn").textContent.replace(/\s/g,'');
  
    return { readType, rate, loopCount, withTrans, loop };
  }
  

  function playNext() {
    if (queue.length === 0) {
      isSpeaking = false; // 队列为空，停止播放
      document.getElementById("playPauseBtn").textContent = "🐬"; // 更改为播放图标
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
    if (readType == "文章") {
      const jp_sentence = element.firstElementChild.textContent;
      jp_sentence && jpAnalyzer.setAttribute("data-text", jp_sentence);
    }
  
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
  
      if (Number(loopCount) > 1) {
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
    document.getElementById("playPauseBtn").textContent = "🐳"; // 更改为暂停图标
    element && element.classList.add("speaking");
  }
  