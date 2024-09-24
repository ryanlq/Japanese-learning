// script.js

import ContextMenu from "https://my-html-sites.pages.dev/components/contextmenu.js";



let jpAnalyzer = document.querySelector("my-jp-analyzer");

let allSentences;

function init_practice(){
  allSentences = Array.from(document.querySelectorAll('#lession-content table tr')).map(t=>{
    return [t.firstElementChild.textContent,t.lastElementChild.textContent]
  })
  if(!allSentences || allSentences.length == 0) return;

  const dictation = document.querySelector('dictation-component')
  const current_index = 0
  dictation.setAttribute('len',allSentences.length)
  dictation.setAttribute('current_index',current_index )
  const current_item = allSentences[current_index]
  dictation.setAttribute('original',current_item[0])
  dictation.setAttribute('translation',current_item[1])
  
  dictation.addEventListener('dictation-complete', (event) => {
    const index = Number(dictation.getAttribute('current_index'))
    const next_index = index + 1
    if(next_index == length) {
      alert("已全部完成")
    } else {
      const current_item = allSentences[next_index]
      dictation.setAttribute('current_index',next_index)
      dictation.setAttribute('original',current_item[0])
      dictation.setAttribute('translation',current_item[1])
    }
  });
}


// 事件处理函数
const contextmenus_options = [
  { label: "Ask", action: "ask" },
  { label: "Copy", action: "copy" },
  { label: "Test", action: "test" },
];

const ContextMenuEventHandler = (event) => {
  if (!event) return;
  const _target = event.target;
  if (_target.tagName === "TD") {
    return _target.textContent;
  }
  return;
};

async function contextmenuActions(action, detail, outputid) {
  if (!action || !detail) return;
  switch (action) {
    case "ask":
      detail && jpAnalyzer.setAttribute("data-text", detail);
      document.getElementById("tab2-btn").click();
      const output = document.getElementById(outputid);
      output && (await ask(output, detail, chatModule));
      break;
    case "copy":
      navigator.clipboard.writeText(detail).then(() => {
        console.log("复制成功:", detail);
      });
      break;
    case "test":
      document.getElementById("tab2-btn").click();
      break;
    default:
      break;
  }
}

// 应用启动函数
export default function startApp() {
  const playPauseBtn = document.getElementById("playPauseBtn");

  const leftContentId = "left-content";
  const leftcontent = document.querySelector(".lession-layout .content");
  leftcontent ? (leftcontent.id = leftContentId) : null;

  new ContextMenu(
    leftContentId,
    contextmenus_options,
    (action, detail) =>
      contextmenuActions(action, detail, "chat-output"),
    ContextMenuEventHandler,
  );


  let content = "";
  voices = loadVoices();
  // window.speechSynthesis.onvoiceschanged = loadVoices;

  const title = "";

  const trs = document.querySelectorAll("table.lession tr");
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
        text && jpAnalyzer.setAttribute("data-text", text);
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
    document.querySelector("#tab1").innerHTML = results;
    NewWords = Array.from(
      document.querySelectorAll("#tab1 tr td:first-child"),
    ).map((td) => td.textContent);
    NewWordMeans = Array.from(
      document.querySelectorAll("#tab1 tr td:last-child"),
    ).map((td) => td.textContent);
    matchWordsRegex = new RegExp(`(${NewWords.join("|")})`, "gi");
  });

  init_practice()

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
