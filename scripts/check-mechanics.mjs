import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const server = await createServer({server:{host:'127.0.0.1',port:0}});
await server.listen();
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
  const page = await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(()=>window.__sunsetShellRunGame?.scene.isActive('WorldMapScene'));
  for (let levelIndex=0;levelIndex<4;levelIndex++) {
    await page.evaluate(levelIndex=>window.__sunsetShellRunGame.scene.start('GameScene',{levelIndex}),levelIndex);
    await page.waitForFunction(i=>{const s=window.__sunsetShellRunGame.scene.getScene('GameScene');return s.scene.isActive()&&s.levelIndex===i&&s.boss?.active},levelIndex);
    const result=await page.evaluate(()=>{
      const s=window.__sunsetShellRunGame.scene.getScene('GameScene');
      const checks=[]; const check=(value,label)=>checks.push([Boolean(value),label]);
      s.winGame();check(!s.state.won,'boss must block finish');
      s.touchCheckpoint();s.player.x=0;s.invulnerableUntil=0;s.shieldUntil=0;s.damagePlayer();
      check(s.player.x===s.spawnPoint.x,'damage respawns at checkpoint');
      for(const type of ['heart','shield','speed','triple']) {
        const powerup=s.powerups.getChildren().find(p=>p.type===type);
        check(Boolean(powerup),'powerup exists '+type);
        if(!powerup)continue;
        const lives=s.state.lives;s.collectPowerup(s.player,powerup);
        if(type==='heart')check(s.state.lives===lives+1,'heart restores life');
        if(type==='shield'){s.invulnerableUntil=0;const hp=s.state.lives;s.damagePlayer();check(s.state.lives===hp&&s.shieldUntil===0,'shield blocks one hit');}
        if(type==='speed')check(s.speedUntil>s.time.now,'speed activates');
        if(type==='triple')check(s.tripleUntil>s.time.now,'triple activates');
      }
      const spring=s.springs.getChildren()[0];s.player.y=spring.y-30;s.player.body.setVelocityY(100);s.touchSpring(s.player,spring);
      check(s.player.body.velocity.y===-560,'spring launches');
      s.defeatBoss();s.winGame();check(s.state.won,'boss defeat unlocks finish');
      return checks;
    });
    for(const [pass,label]of result)assert(pass,`theme ${levelIndex}: ${label}`);
    console.log(`Theme ${levelIndex}: checkpoint, four powerups, spring, boss-gated finish pass.`);
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();await server.close();}
