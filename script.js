(function () {
  const socket = io();
  const initialState = {
    homeName: "筑波",
    awayName: "",
    homeLogo: "/images/tsukuba-logo.avif",
    awayLogo: "",
    homeScore: 0,
    awayScore: 0,
    quarter: "Q1"
  };

  // ★ 1. ページを読み込んだとき、ブラウザに保存されているデータがあればそれを最優先で復元する
  const savedState = localStorage.getItem("lax_scoreboard_state");
  let scoreboard = savedState ? JSON.parse(savedState) : { ...initialState };

  function sanitizeState(data) {
    const allowedQuarters = ["Q1", "Q2", "Q3", "Q4"];
    const nextQuarter = allowedQuarters.includes(String(data?.quarter)) ? String(data.quarter) : scoreboard.quarter;

    return {
      homeName: "筑波",
      awayName: data?.awayName !== undefined ? String(data.awayName).slice(0, 20) : scoreboard.awayName,
      awayLogo: String(data?.awayLogo ?? scoreboard.awayLogo),
      homeScore: Math.max(0, Number(data?.homeScore ?? scoreboard.homeScore) || 0),
      awayScore: Math.max(0, Number(data?.awayScore ?? scoreboard.awayScore) || 0),
      quarter: nextQuarter
    };
  }

  // ★ 2. 同期するときに、最新の状態をブラウザに自動でバックアップ保存する
  function syncState() {
    localStorage.setItem("lax_scoreboard_state", JSON.stringify(scoreboard));
    socket.emit("state", scoreboard);
  }

  function updateViews() {
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

    const overlayHomeName = document.getElementById("overlayHomeName");
    const overlayAwayName = document.getElementById("overlayAwayName");
    const overlayAwayLogo = document.getElementById("overlayAwayLogo");
    const overlayHomeScore = document.getElementById("overlayHomeScore");
    const overlayAwayScore = document.getElementById("overlayAwayScore");
    const overlayQuarter = document.getElementById("overlayQuarter");

    if (overlayHomeName) overlayHomeName.textContent = scoreboard.homeName;
    if (overlayAwayName) overlayAwayName.textContent = scoreboard.awayName;
    
    if (overlayAwayLogo) {
      if (scoreboard.awayLogo) {
        overlayAwayLogo.src = scoreboard.awayLogo;
        overlayAwayLogo.style.display = "inline-block"; 
      } else {
        overlayAwayLogo.style.display = "none";  
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
      scoreboard.awayName = event.target.value;
      syncState();
      updateViews();
    });

    awayLogoFile?.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            
            const targetWidth = 120; 
            const targetHeight = (img.height / img.width) * targetWidth;
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            
            scoreboard.awayLogo = canvas.toDataURL("image/png");
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

    // ★ 3. リセットボタンを押したときだけ、保存したデータを完全に削除する
    resetButton?.addEventListener("click", () => {
      scoreboard = { ...initialState }; // 初期値に戻す
      localStorage.removeItem("lax_scoreboard_state"); // 保存データを削除
      if (awayLogoFile) awayLogoFile.value = "";
      syncState();
      updateViews();
    });

    updateViews();
  });

  socket.on("connect", () => {
    syncState();
  });

  socket.on("state", (data) => {
    scoreboard = sanitizeState(data);
    // 受信したときもブラウザの保存データを更新しておく
    localStorage.setItem("lax_scoreboard_state", JSON.stringify(scoreboard));
    updateViews();
  });
})();