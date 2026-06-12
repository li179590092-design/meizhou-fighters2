/* 梅开格斗：开放之战 —— 联机服务器
 * 功能：静态托管游戏页面 + Socket.IO 房间中继 + 邀请二维码生成
 */
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require("qrcode");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 10000,
  pingTimeout: 20000
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/healthz", (req, res) => res.type("text").send("ok"));

// 邀请链接二维码：/qr?t=<url>
app.get("/qr", async (req, res) => {
  try {
    const text = String(req.query.t || "").slice(0, 300);
    if (!text) return res.status(400).send("missing t");
    const png = await QRCode.toBuffer(text, {
      type: "png", width: 320, margin: 1,
      color: { dark: "#1a1040", light: "#ffffff" }
    });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(png);
  } catch (e) {
    res.status(500).send("qr error");
  }
});

/* ---------------- 房间逻辑 ---------------- */
const rooms = new Map(); // roomId -> {p1, p2, ready1, ready2}
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 去掉易混淆字符

function newRoomId() {
  for (let tries = 0; tries < 50; tries++) {
    let id = "";
    for (let i = 0; i < 4; i++) id += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    if (!rooms.has(id)) return id;
  }
  return String(Date.now()).slice(-6);
}

function peerOf(room, socket) {
  if (!room) return null;
  return room.p1 === socket ? room.p2 : room.p1;
}

io.on("connection", (socket) => {
  socket.data.roomId = null;

  socket.on("createRoom", (cb) => {
    if (typeof cb !== "function") return;
    leaveCurrentRoom(socket);
    const roomId = newRoomId();
    rooms.set(roomId, { p1: socket, p2: null, ready1: false, ready2: false });
    socket.data.roomId = roomId;
    socket.data.seat = 1;
    cb({ ok: true, roomId, seat: 1 });
    socket.emit("roomUpdate", { count: 1 });
  });

  socket.on("joinRoom", (code, cb) => {
    if (typeof cb !== "function") return;
    const roomId = String(code || "").trim().toUpperCase();
    const room = rooms.get(roomId);
    if (!room) return cb({ ok: false, msg: "房间不存在，请确认房间号（区分0和O哦）" });
    if (room.p2) return cb({ ok: false, msg: "房间已满，两位选手已就位" });
    if (room.p1 === socket) return cb({ ok: false, msg: "您已是本房间房主" });
    leaveCurrentRoom(socket);
    room.p2 = socket;
    socket.data.roomId = roomId;
    socket.data.seat = 2;
    cb({ ok: true, roomId, seat: 2 });
    if (room.p1) room.p1.emit("roomUpdate", { count: 2 });
    socket.emit("roomUpdate", { count: 2 });
  });

  socket.on("ready", () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;
    if (socket.data.seat === 1) room.ready1 = true; else room.ready2 = true;
    const state = { p1: room.ready1, p2: room.ready2 };
    if (room.p1) room.p1.emit("readyState", state);
    if (room.p2) room.p2.emit("readyState", state);
    if (room.ready1 && room.ready2 && room.p1 && room.p2) {
      room.ready1 = false; room.ready2 = false; // 为再战复位
      room.p1.emit("startGame");
      room.p2.emit("startGame");
    }
  });

  // 对战数据中继（状态/受击/弹道/特效等）
  socket.on("data", (msg) => {
    const peer = peerOf(rooms.get(socket.data.roomId), socket);
    if (peer) peer.emit("data", msg);
  });

  socket.on("rematch", () => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return;
    room.ready1 = false; room.ready2 = false;
    const peer = peerOf(room, socket);
    if (peer) peer.emit("rematchAsk");
  });

  socket.on("disconnect", () => leaveCurrentRoom(socket));

  function leaveCurrentRoom(s) {
    const roomId = s.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    s.data.roomId = null;
    if (!room) return;
    const peer = peerOf(room, s);
    if (room.p1 === s) room.p1 = null;
    if (room.p2 === s) room.p2 = null;
    if (peer) peer.emit("peerLeft");
    if (!room.p1 && !room.p2) rooms.delete(roomId);
  }
});

// 空房间定期清理（保险）
setInterval(() => {
  for (const [id, r] of rooms) if (!r.p1 && !r.p2) rooms.delete(id);
}, 60000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("梅开格斗服务已启动，端口 " + PORT));
