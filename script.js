(function () {
  const socket = io();
  const initialState = {
    homeName: "筑波",
    awayName: "AWAY",
    homeLogo: "/images/筑波ロゴ.avif",
    awayLogo: "", // 最初はアウェイロゴは空（なし）にします
    homeScore: 0,
    awayScore: 0,
    quarter: "Q1"
  };

  let scoreboard = { ...initialState };

  // ページ読み込み時に、保存されている画像があれば復元する
  const savedAwayLogo = localStorage.getItem("awayLogoData");
  if (savedAwayLogo) {
    scoreboard.awayLogo = savedAwayLogo;
  }

  function sanitizeState(data) {
    const allowedQuarters = ["Q1", "Q2", "Q3", "Q4"];
    const nextQuarter = allowedQuarters.includes(String(data?.quarter)) ? String(data.quarter) : scoreboard.quarter;

    return {
      homeName: "筑波",
      awayName: String(data?.awayName ?? scoreboard.awayName).slice(0, 20) || "AWAY",
      awayLogo: String(data?.awayLogo ?? scoreboard.awayLogo),
      homeScore: Math.max(0, Number(data?.homeScore ?? scoreboard.homeScore) || 0),
      awayScore: Math.max(0, Number(data?.awayScore ?? scoreboard.awayScore) || 0),
      quarter: nextQuarter
    };
  }

  function syncState() {
    socket.emit("state", scoreboard);
  }

  function updateViews() {
    // コントロール画面の要素
    const homeNameInput = document.getElementById("homeName");
    const awayNameInput = document.getElementById("awayName");
    const homeScoreDisplay = document.getElementById("homeScoreDisplay");
    const awayScoreDisplay = document.getElementById("awayScoreDisplay");

    if (homeNameInput) homeNameInput.value = scoreboard.homeName;
    if (awayNameInput) awayNameInput.value = scoreboard.awayName;
    if (homeScoreDisplay) homeScoreDisplay.textContent = scoreboard.homeScore;
    if (awayScoreDisplay) awayScoreDisplay.textContent = scoreboard.awayScore;

    document.querySelectorAll(".quarter-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.quarter === scoreboard.quarter);
    });

    // OBS・スコアボード画面の要素
    const overlayHomeName = document.getElementById("overlayHomeName");
    const overlayAwayName = document.getElementById("overlayAwayName");
    const overlayAwayLogo = document.getElementById("overlayAwayLogo");
    const overlayHomeScore = document.getElementById("overlayHomeScore");
    const overlayAwayScore = document.getElementById("overlayAwayScore");
    const overlayQuarter = document.getElementById("overlayQuarter");

    if (overlayHomeName) overlayHomeName.textContent = scoreboard.homeName;
    if (overlayAwayName) overlayAwayName.textContent = scoreboard.awayName;
    
    // アウェイロゴの表示処理
    if (overlayAwayLogo) {
      if (scoreboard.awayLogo) {
        overlayAwayLogo.src = scoreboard.awayLogo;
        overlayAwayLogo.style.display = "block"; // 画像がある時は表示
      } else {
        overlayAwayLogo.style.display = "none";  // 画像がない時は非表示（枠が壊れるのを防ぐ）
      }
    }
    
    if (overlayHomeScore) overlayHomeScore.textContent = scoreboard.homeScore;
    if (overlayAwayScore) overlayAwayScore.textContent = scoreboard.awayScore;
    if (overlayQuarter) overlayQuarter.textContent = scoreboard.quarter;
  }

  window.addEventListener("DOMContentLoaded", () => {
    const awayNameInput = document.getElementById("awayName");
    const awayLogoFile = document.getElementById("awayLogoFile");
    const resetButton = document.getElementById("resetButton");

    awayNameInput?.addEventListener("input", (event) => {
      scoreboard.awayName = event.target.value.trim() || "AWAY";
      syncState();
      updateViews();
    });

    // ファイル選択時の処理
    awayLogoFile?.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const targetWidth = 150; 
            const targetHeight = (img.height / img.width) * targetWidth;
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            const imageData = canvas.toDataURL("image/png");
            scoreboard.awayLogo = imageData;
            
            // ローカルストレージに保存して他の画面へ強制同期
            localStorage.setItem("awayLogoData", imageData);
            
            syncState();
            updateViews();
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    document.querySelectorAll(".score-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const { team, action } = button.dataset;
        const delta = action === "add" ? 1 : -1;

        if (team === "home") {
          scoreboard.homeScore = Math.max(0, scoreboard.homeScore + delta);
        } else {
          scoreboard.awayScore = Math.max(0, scoreboard.awayScore + delta);
        }

        syncState();
        updateViews();
      });
    });

    document.querySelectorAll(".quarter-btn").forEach((button) => {
      button.addEventListener("click", () => {
        scoreboard.quarter = button.dataset.quarter;
        syncState();
        updateViews();
      });
    });

    resetButton?.addEventListener("click", () => {
      scoreboard.homeScore = 0;
      scoreboard.awayScore = 0;
      scoreboard.quarter = "Q1";
      scoreboard.awayLogo = "";
      localStorage.removeItem("awayLogoData"); // 保存された画像を消去
      if (awayLogoFile) awayLogoFile.value = "";
      syncState();
      updateViews();
    });

    updateViews();
  });

  // 他のタブ（OBS画面など）で画像が変わったイベントを検知する
  window.addEventListener("storage", (event) => {
    if (event.key === "awayLogoData") {
      scoreboard.awayLogo = event.newValue || "";
      updateViews();
    }
  });

  socket.on("connect", () => {
    syncState();
  });

  socket.on("state", (data) => {
    scoreboard = sanitizeState(data);
    // サーバーから送られてきたデータにロゴがあればそれを優先
    if (data && data.awayLogo) {
      scoreboard.awayLogo = data.awayLogo;
    } else {
      scoreboard.awayLogo = localStorage.getItem("awayLogoData") || "";
    }
    updateViews();
  });
})();