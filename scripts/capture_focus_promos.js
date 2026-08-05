async (page) => {
  const render = async ({ scene, title, subtitle, goal, time, online, output }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(`
      <!doctype html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <style>
            * { box-sizing: border-box; }
            html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
            body {
              font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
              color: #f9f4e9;
              background: #102426 url("http://127.0.0.1:4173/scenes/${scene}-2560.webp") center/cover no-repeat;
            }
            body::before {
              content: ""; position: fixed; inset: 0;
              background: linear-gradient(180deg, rgba(7,16,19,.24), rgba(6,14,17,.04) 45%, rgba(5,12,14,.45));
            }
            body::after {
              content: ""; position: fixed; inset: 0;
              box-shadow: inset 0 0 180px rgba(3,9,11,.45);
            }
            .glass {
              background: linear-gradient(135deg, rgba(36,55,57,.64), rgba(11,24,27,.72));
              border: 1px solid rgba(255,255,255,.32);
              box-shadow: 0 26px 75px rgba(0,0,0,.28), inset 0 1px rgba(255,255,255,.2);
              backdrop-filter: blur(18px) saturate(125%);
            }
            .topbar {
              position: fixed; z-index: 2; top: 26px; left: 34px; right: 34px; height: 76px;
              border-radius: 28px; display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; padding: 0 20px;
            }
            .brand { display: flex; align-items: center; gap: 14px; font-size: 26px; letter-spacing: .18em; }
            .leaf { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 16px; background: rgba(233,194,117,.16); color: #f0ca82; font-size: 26px; }
            .scene-name { text-align: center; font-size: 16px; letter-spacing: .08em; color: rgba(255,255,255,.86); }
            .scene-name i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #7dbf9d; margin-right: 11px; box-shadow: 0 0 18px #76b696; }
            .right { justify-self: end; display: flex; gap: 10px; }
            .pill { padding: 12px 18px; border-radius: 20px; background: rgba(8,20,22,.42); border: 1px solid rgba(255,255,255,.16); font-size: 14px; }
            .people { position: fixed; z-index: 2; top: 126px; right: 44px; padding: 12px 18px; border-radius: 22px; font-size: 14px; }
            .timer { position: fixed; z-index: 2; left: 60px; bottom: 78px; width: 485px; padding: 30px 34px 28px; border-radius: 34px; }
            .timer-head { display: flex; align-items: center; justify-content: space-between; color: rgba(255,255,255,.66); font-size: 14px; letter-spacing: .12em; }
            .timer-head b { padding: 9px 14px; border-radius: 16px; background: rgba(255,255,255,.09); color: #f0d49b; font-weight: 500; }
            .clock { margin-top: 20px; font-family: Georgia, serif; font-size: 86px; letter-spacing: -.04em; text-shadow: 0 12px 28px rgba(0,0,0,.28); }
            .goal { margin: 6px 0 27px; font-size: 20px; color: rgba(255,255,255,.82); }
            .goal::before { content: ""; display: inline-block; width: 28px; height: 2px; background: #e6bd72; margin: 0 15px 6px 0; }
            .track { height: 4px; border-radius: 4px; background: rgba(255,255,255,.18); overflow: hidden; }
            .track span { display: block; width: 44%; height: 100%; background: linear-gradient(90deg,#f1ce86,#dca85a); box-shadow: 0 0 16px #e4b765; }
            .meta { display: flex; justify-content: space-between; margin-top: 14px; color: rgba(255,255,255,.52); font-size: 13px; }
            .dock { position: fixed; z-index: 2; left: 50%; bottom: 31px; transform: translateX(-8%); display: flex; gap: 10px; padding: 10px; border-radius: 28px; }
            .dock button { border: 0; color: rgba(255,255,255,.88); background: rgba(255,255,255,.08); border-radius: 19px; padding: 14px 20px; font-size: 14px; }
            .dock button.primary { color: #163d37; background: #f0d397; font-weight: 700; }
            .quote { position: fixed; z-index: 2; left: 50%; top: 43%; transform: translate(-4%,-50%); max-width: 560px; text-align: right; text-shadow: 0 4px 24px rgba(0,0,0,.5); }
            .quote h1 { margin: 0; font-family: Georgia, "Microsoft YaHei", serif; font-size: 46px; font-weight: 500; letter-spacing: .08em; }
            .quote p { font-size: 16px; letter-spacing: .12em; color: rgba(255,255,255,.73); }
            .motes { position: fixed; inset: 0; z-index: 1; opacity: .55; background-image: radial-gradient(circle at 22% 34%, rgba(242,203,123,.8) 0 2px, transparent 3px), radial-gradient(circle at 65% 18%, rgba(255,235,178,.65) 0 1px, transparent 2px), radial-gradient(circle at 78% 70%, rgba(242,203,123,.7) 0 2px, transparent 3px), radial-gradient(circle at 41% 81%, rgba(255,235,178,.5) 0 1px, transparent 2px); }
          </style>
        </head>
        <body>
          <div class="motes"></div>
          <header class="topbar glass">
            <div class="brand"><span class="leaf">⌁</span><span>栖时</span></div>
            <div class="scene-name"><i></i>${title}</div>
            <div class="right"><span class="pill">声音已开启</span><span class="pill">⛶ 全屏</span></div>
          </header>
          <div class="people glass">◉ ${online} 人正在同一场景专注</div>
          <section class="quote"><h1>${subtitle}</h1><p>让时间安静地向前走</p></section>
          <section class="timer glass">
            <div class="timer-head"><span>专注倒计时</span><b>大数字</b></div>
            <div class="clock">${time}</div>
            <div class="goal">${goal}</div>
            <div class="track"><span></span></div>
            <div class="meta"><span>已专注 11 分钟</span><span>保持呼吸，继续向前</span></div>
          </section>
          <nav class="dock glass">
            <button>▧ 场景</button><button>♫ 声音</button><button class="primary">Ⅱ 暂停</button><button>⛶ 全屏</button><button>结束</button>
          </nav>
        </body>
      </html>
    `, { waitUntil: "networkidle" });
    await page.screenshot({ path: output, type: "png" });
  };

  await render({
    scene: "morning-classroom",
    title: "清晨日光课堂",
    subtitle: "把今天的第一束光，留给学习。",
    goal: "完成高数第三章复习",
    time: "38:42",
    online: 18,
    output: "output/qishi-focus-morning-classroom.png",
  });
  await render({
    scene: "night-train",
    title: "夜行山谷书厢",
    subtitle: "窗外向后退，目标只管向前。",
    goal: "安静读完这一节",
    time: "24:16",
    online: 9,
    output: "output/qishi-focus-night-train.png",
  });
}
