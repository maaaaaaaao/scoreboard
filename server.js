const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

let scoreboard = {
  homeName: "筑波",
  awayName: "AWAY",
  homeScore: 0,
  awayScore: 0,
  quarter: "Q1"
};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "control.html"));
});

io.on("connection", (socket) => {
  socket.emit("state", scoreboard);

  socket.on("state", (data) => {
    if (!data || typeof data !== "object") return;

    const allowedQuarters = ["Q1", "Q2", "Q3", "Q4"];
    const nextQuarter = allowedQuarters.includes(String(data.quarter))
      ? String(data.quarter)
      : scoreboard.quarter;

    scoreboard = {
      homeName: String(data.homeName ?? scoreboard.homeName).slice(0, 20) || "HOME",
      awayName: String(data.awayName ?? scoreboard.awayName).slice(0, 20) || "AWAY",
      homeScore: Math.max(0, Number(data.homeScore ?? scoreboard.homeScore) || 0),
      awayScore: Math.max(0, Number(data.awayScore ?? scoreboard.awayScore) || 0),
      quarter: nextQuarter
    };

    io.emit("state", scoreboard);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Lacrosse scoreboard server running on port ${PORT}`);
});