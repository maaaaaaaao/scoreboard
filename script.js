(function () {
  const socket = io();
  const initialState = {
    homeName: "筑波",
    awayName: "", 
    homeLogo: "images/筑波ロゴ.avif",
    awayLogo: "",
    homeScore: 0,
    awayScore: 0,
    quarter: "Q1"
  };

  const savedState = localStorage.getItem("lax_scoreboard_state");
  let scoreboard = savedState ? JSON.parse(savedState) : { ...initialState };

  function sanitizeState(data) {
    const allowedQuarters = ["Q1", "Q2", "Q3", "Q4"];
    const nextQuarter = allowedQuarters.includes(String(data?.quarter)) ? String(data.quarter) : scoreboard.quarter;

    return {
      homeName: "筑波",
      awayName: data?.awayName !== undefined && data?.awayName !== null && String(data.awayName) !== "AWAY" ? String(data.awayName).slice(0, 20) : "",
      awayLogo: data?.awayLogo !== undefined && data?.awayLogo !== null ? String(data.awayLogo) : "",
      homeScore: Math.max(0, Number(data?.homeScore ?? scoreboard.homeScore) || 0),
      awayScore: Math.max(0, Number(data?.awayScore ?? scoreboard.awayScore) || 0),
      quarter: nextQuarter
    };
  }

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
    
    if (overlayAwayName) {
      overlayAwayName.textContent = (scoreboard.awayName && scoreboard.awayName !== "AWAY") ? scoreboard.awayName : "";
    }
    
    if (overlayAwayLogo) {
      if (scoreboard.awayLogo) {
        overlayAwayLogo.src = scoreboard.awayLogo;
        overlayAwayLogo.style.display = "inline-block"; 
      } else {
        overlayAwayLogo.src = "";
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

    // ★ どんな画像（HEIC/PNG/JPEG）でも透過を維持して極小PNGに変換し、確実に送信する処理
    awayLogoFile?.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          // 送信エラーを防ぐため、さらにコンパクトな極小サイズ（最大100px）に制限
          const maxDim = 100; 
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          try {
            // ★ PNG形式（透過対応）で書き出し、スマホでも高確率で処理できる形にします
            const imageData = canvas.toDataURL("image/png");
            scoreboard.awayLogo = imageData;
            syncState();
            updateViews();
          } catch (err) {
            console.error("スマホ画像処理エラー:", err);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
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
      localStorage.removeItem("lax_scoreboard_state");
      scoreboard = {
        homeName: "筑波",
        awayName: "", 
        homeLogo: "images/筑波ロゴ.avif",
        awayLogo: "",
        homeScore: 0,
        awayScore: 0,
        quarter: "Q1"
      };
      if (awayNameInput) awayNameInput.value = "";
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
    localStorage.setItem("lax_scoreboard_state", JSON.stringify(scoreboard));
    updateViews();
  });
})();
