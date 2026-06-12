/* 梅开格斗：开放之战 —— 联机服务端
 * Express 提供静态页面，Socket.IO 提供房间与战斗状态同步。
 * 房间逻辑：2 名玩家，房主=罗一帅(P1)，加入者=杨二帅(P2)。
 */
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "..", "public")));
app.get("/healthz", (_, res) => res.send("ok"));

/* ---------------- 房间管理 ---------------- */
const rooms = new Map(); // roomId -> { players: [socketId, socketId?], ready: Set, started: bool }

function genRoomId() {
  let id;
  do {
    id = Math.random().toString(36).slice(2, 6).toUpperCase()
      .replace(/0/g, "X").replace(/O/g, "Y").replace(/1/g, "Z").replace(/I/g, "W");
  } while (rooms.has(id));
  return id;
}

io.on("connection", (socket) => {
  let myRoom = null;

  socket.on("createRoom", (cb) => {
    const id = genRoomId();
    rooms.set(id, { players: [socket.id], ready: new Set(), started: false });
    myRoom = id;
    socket.join(id);
    cb && cb({ ok: true, roomId: id, seat: 1 });
  });

  socket.on("joinRoom", (roomId, cb) => {
    roomId = String(roomId || "").trim().toUpperCase();
    const r = rooms.get(roomId);
    if (!r) return cb && cb({ ok: false, err: "房间不存在或已关闭" });
    if (r.players.length >= 2) return cb && cb({ ok: false, err: "房间已满" });
    r.players.push(socket.id);
    myRoom = roomId;
    socket.join(roomId);
    cb && cb({ ok: true, roomId, seat: 2 });
    io.to(roomId).emit("roomUpdate", { count: r.players.length });
  });

  socket.on("ready", (isReady) => {
    const r = rooms.get(myRoom);
    if (!r) return;
    if (isReady) r.ready.add(socket.id); else r.ready.delete(socket.id);
    io.to(myRoom).emit("readyState", {
      readyCount: r.ready.size,
      youReady: undefined
    });
    if (r.players.length === 2 && r.ready.size === 2 && !r.started) {
      r.started = true;
      io.to(myRoom).emit("startGame", { t: Date.now() });
    }
  });

  /* 战斗数据透传：位置 / 动作 / 命中 / 血量 / 回合 / 重赛 */
  socket.on("data", (payload) => {
    if (myRoom) socket.to(myRoom).emit("data", payload);
  });

  socket.on("rematch", () => {
    const r = rooms.get(myRoom);
    if (!r) return;
    r.ready = new Set();
    r.started = false;
    socket.to(myRoom).emit("rematchAsk");
  });

  socket.on("disconnect", () => {
    const r = rooms.get(myRoom);
    if (!r) return;
    r.players = r.players.filter((p) => p !== socket.id);
    r.ready.delete(socket.id);
    if (r.players.length === 0) rooms.delete(myRoom);
    else {
      r.started = false;
      io.to(myRoom).emit("peerLeft");
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("梅开格斗服务已启动: http://localhost:" + PORT));
