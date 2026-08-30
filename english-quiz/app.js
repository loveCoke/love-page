(function () {
  "use strict";

  var BANK = window.QUESTION_BANK || [];
  var ALL = [];
  var BY_KEY = {};

  BANK.forEach(function (group, gi) {
    group.questions.forEach(function (q, qi) {
      var item = {
        key: "g" + (gi + 1) + "-q" + (qi + 1),
        group: group.group,
        source: group.source,
        stem: q.stem,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        translation: q.translation
      };
      ALL.push(item);
      BY_KEY[item.key] = item;
    });
  });

  var STORE_KEY = "english_brush_v1";
  var records = loadRecords();
  var filter = "all";
  var mode = "all";
  var list = [];
  var pos = 0;
  var chosen = {};

  function $(id) {
    return document.getElementById(id);
  }

  function loadRecords() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveRecords() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(records));
    } catch (e) {
      // storage unavailable; session-only usage still works
    }
  }

  function recordFor(key) {
    if (!records[key]) {
      records[key] = { wrong: 0, manual: false, mastered: false, last: null };
    }
    return records[key];
  }

  function isWrong(key) {
    var r = records[key];
    return !!(r && (r.wrong > 0 || r.manual));
  }

  function matchesFilter(q) {
    return filter === "all" || q.group.indexOf(filter) >= 0;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function buildList() {
    var base = ALL.filter(matchesFilter);
    if (mode === "wrong" || mode === "wrongRandom") {
      base = base.filter(function (q) {
        return isWrong(q.key);
      });
    }
    if (mode === "random" || mode === "wrongRandom") {
      base = shuffle(base);
    }
    list = base;
    pos = 0;
    chosen = {};
  }

  function stats() {
    var answered = 0;
    var correct = 0;
    var wrong = 0;
    ALL.forEach(function (q) {
      var r = records[q.key];
      if (!r) return;
      if (r.last) {
        answered++;
        if (r.last.ok) correct++;
      }
      if (r.wrong > 0 || r.manual) wrong++;
    });
    var rate = answered ? Math.round((correct / answered) * 100) : null;
    return { answered: answered, correct: correct, wrong: wrong, rate: rate };
  }

  function renderStats() {
    var s = stats();
    $("statsLine").textContent = "已答 " + s.answered + "/" + ALL.length +
      " · 正确率 " + (s.rate === null ? "--" : s.rate + "%");
    $("wrongBadge").textContent = "错题 " + s.wrong;
    $("sumAnswered").textContent = s.answered;
    $("sumCorrect").textContent = s.correct;
    $("sumRate").textContent = s.rate === null ? "--" : s.rate + "%";
    $("sumWrong").textContent = s.wrong;
  }

  function renderQuestion(q) {
    $("questionTag").textContent = q.group + " · 第 " + q.key.split("-")[1].slice(1) + " 题";
    $("progressText").textContent = (pos + 1) + " / " + list.length;
    $("questionStem").textContent = q.stem;

    var optBox = $("options");
    optBox.innerHTML = "";
    var letters = ["A", "B", "C", "D"];
    var picked = chosen[q.key] || null;

    q.options.forEach(function (opt, i) {
      var letter = letters[i];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";

      var mark = document.createElement("span");
      mark.className = "letter";
      mark.textContent = letter;
      var text = document.createElement("span");
      text.className = "text";
      text.textContent = opt;
      btn.appendChild(mark);
      btn.appendChild(text);

      if (picked) {
        btn.disabled = true;
        if (letter === q.answer) {
          btn.classList.add("correct");
        } else if (letter === picked) {
          btn.classList.add("wrong");
        }
      } else {
        btn.addEventListener("click", function () {
          choose(q.key, letter);
        });
      }
      optBox.appendChild(btn);
    });

    var rec = recordFor(q.key);
    var result = $("result");
    if (picked) {
      result.classList.remove("hidden");
      var ok = picked === q.answer;
      var verdict = $("verdict");
      verdict.className = "result-verdict " + (ok ? "ok" : "no");
      verdict.textContent = ok ? "回答正确" : "回答错误";
      $("correctAnswer").textContent = q.answer + ". " +
        q.options[q.answer.charCodeAt(0) - 65];
      $("explanation").textContent = q.explanation;
      $("translation").textContent = q.translation;
      $("wrongToggleBtn").textContent = isWrong(q.key) ? "移出错题本" : "加入错题本";
      $("masterToggleBtn").textContent = rec.mastered ? "取消掌握标记" : "标记为已掌握";
    } else {
      result.classList.add("hidden");
    }

    $("prevBtn").disabled = pos === 0;
    $("nextBtn").disabled = false;
    $("navHint").textContent = mode === "wrong" || mode === "wrongRandom"
      ? "当前为错题模式"
      : "顺序 / 随机模式";
  }

  function renderEmpty() {
    var overlay = $("overlay");
    overlay.innerHTML =
      '<div class="empty"><h3>当前没有可刷的题目</h3>' +
      "<p>如果这是错题本，说明错题已清空，先去刷题吧。</p></div>";
    overlay.classList.remove("hidden");
  }

  function renderComplete() {
    var overlay = $("overlay");
    var s = stats();
    overlay.innerHTML =
      '<div class="complete-box"><h3>本轮刷题完成</h3>' +
      "<p>共 " + list.length + " 题 · 已答 " + s.answered +
      " · 正确率 " + (s.rate === null ? "--" : s.rate + "%") + "</p>" +
      '<div class="actions">' +
      '<button type="button" class="btn" id="restartBtn">再来一轮</button>' +
      '<button type="button" class="btn btn-warn" id="wrongAgainBtn">错题重刷</button>' +
      "</div></div>";
    overlay.classList.remove("hidden");
    $("restartBtn").addEventListener("click", function () {
      buildList();
      render();
    });
    $("wrongAgainBtn").addEventListener("click", function () {
      mode = "wrongRandom";
      buildList();
      render();
    });
  }

  function render() {
    renderStats();
    var stage = $("stage");
    var overlay = $("overlay");
    var qp = stage.querySelector(".question-panel");
    var nav = stage.querySelector(".nav-bar");
    if (list.length === 0) {
      qp.classList.add("hidden");
      nav.classList.add("hidden");
      renderEmpty();
      return;
    }
    if (pos >= list.length) {
      qp.classList.add("hidden");
      nav.classList.add("hidden");
      renderComplete();
      return;
    }
    overlay.classList.add("hidden");
    qp.classList.remove("hidden");
    nav.classList.remove("hidden");
    renderQuestion(list[pos]);
  }

  function choose(key, letter) {
    var q = BY_KEY[key];
    var rec = recordFor(key);
    var ok = letter === q.answer;
    rec.last = { choice: letter, ok: ok };
    if (!ok) {
      rec.wrong++;
      rec.manual = false;
    }
    saveRecords();
    chosen[key] = letter;
    render();
  }

  function setMode(nextMode) {
    mode = nextMode;
    var label = "";
    if (mode === "all") label = "顺序刷题";
    if (mode === "random") label = "随机刷题";
    if (mode === "wrong") label = "错题本";
    if (mode === "wrongRandom") label = "错题重刷";
    $("modeBadge").textContent = label;
    buildList();
    render();
  }

  function bindEvents() {
    var filterBtns = document.querySelectorAll("#quizFilter button");
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filter = btn.getAttribute("data-filter");
        filterBtns.forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        buildList();
        render();
      });
    });

    $("sequenceBtn").addEventListener("click", function () {
      setMode("all");
    });
    $("randomBtn").addEventListener("click", function () {
      setMode("random");
    });
    $("wrongBtn").addEventListener("click", function () {
      setMode("wrong");
    });
    $("wrongRandomBtn").addEventListener("click", function () {
      setMode("wrongRandom");
    });
    $("clearWrongBtn").addEventListener("click", function () {
      if (!confirm("确定要清空所有错题记录吗？")) return;
      ALL.forEach(function (q) {
        var r = records[q.key];
        if (r) {
          r.wrong = 0;
          r.manual = false;
        }
      });
      saveRecords();
      buildList();
      render();
    });

    $("prevBtn").addEventListener("click", function () {
      if (pos > 0) {
        pos--;
        render();
      }
    });
    $("nextBtn").addEventListener("click", function () {
      if (pos < list.length - 1) {
        pos++;
        render();
      } else {
        pos++;
        render();
      }
    });

    $("wrongToggleBtn").addEventListener("click", function () {
      var q = list[pos];
      var rec = recordFor(q.key);
      if (isWrong(q.key)) {
        rec.wrong = 0;
        rec.manual = false;
      } else {
        rec.manual = true;
      }
      saveRecords();
      render();
    });

    $("masterToggleBtn").addEventListener("click", function () {
      var q = list[pos];
      var rec = recordFor(q.key);
      rec.mastered = !rec.mastered;
      saveRecords();
      render();
    });
  }

  bindEvents();
  buildList();
  render();
})();
