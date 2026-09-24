import { createRequire as e } from "node:module";
//#region \0rolldown/runtime.js
var t = /* @__PURE__ */ e(import.meta.url), { app: n, BrowserWindow: r } = t("electron"), i = t("path"), { spawn: a } = t("child_process"), o, s;
function c() {
	o = new r({
		width: 1280,
		height: 800,
		webPreferences: {
			preload: i.join(__dirname, "preload.js"),
			nodeIntegration: !0,
			contextIsolation: !1
		},
		icon: i.join(__dirname, "../public/vite.svg")
	}), process.env.VITE_DEV_SERVER_URL ? o.loadURL(process.env.VITE_DEV_SERVER_URL) : o.loadFile(i.join(__dirname, "../dist/index.html"));
}
function l() {
	let e = i.join(__dirname, "../cctv-connector/index.js");
	console.log("Starting CCTV Connector at:", e), s = a("node", ["--env-file=../cctv-connector/.env", e], {
		cwd: i.join(__dirname, "../cctv-connector"),
		env: { ...process.env }
	}), s.stdout.on("data", (e) => {
		console.log(`[Connector]: ${e}`);
	}), s.stderr.on("data", (e) => {
		console.error(`[Connector Error]: ${e}`);
	});
}
n.whenReady().then(() => {
	l(), c(), n.on("activate", () => {
		r.getAllWindows().length === 0 && c();
	});
}), n.on("window-all-closed", () => {
	process.platform !== "darwin" && n.quit();
}), n.on("quit", () => {
	s && s.kill();
});
//#endregion
export {};
