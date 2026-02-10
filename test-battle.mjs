/**
 * Headless battle test using Chrome DevTools Protocol (CDP).
 * Uses Node 22 native WebSocket — no extra dependencies needed.
 */
import { execSync, spawn } from 'child_process';
import http from 'http';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const GAME_URL = 'http://localhost:5173/';
const CDP_PORT = 9222;

// Kill any existing headless Chrome on our debug port
try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`); } catch { }

// Launch Chrome headless
console.log('🚀 Launching headless Chrome...');
const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    GAME_URL
], { stdio: 'ignore', detached: true });

await new Promise(r => setTimeout(r, 4000));

function httpGet(url) {
    return new Promise((resolve, reject) => {
        http.get(url, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

// CDP eval using native WebSocket
function cdpEval(ws, expr) {
    const id = Math.floor(Math.random() * 100000);
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('CDP timeout')), 30000);
        const handler = (event) => {
            const msg = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
            if (msg.id === id) {
                clearTimeout(timeout);
                ws.removeEventListener('message', handler);
                if (msg.error) reject(new Error(msg.error.message));
                else resolve(msg.result?.result?.value);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({
            id, method: 'Runtime.evaluate',
            params: { expression: expr, returnByValue: true, awaitPromise: true }
        }));
    });
}

try {
    console.log('🔗 Connecting to Chrome DevTools...');
    const targets = await httpGet(`http://127.0.0.1:${CDP_PORT}/json`);
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target found');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve);
        ws.addEventListener('error', reject);
    });

    console.log('⏳ Waiting for game to load...');
    await new Promise(r => setTimeout(r, 4000));

    // Check RTK API
    let hasRtk = await cdpEval(ws, `!!window.rtk`);
    if (!hasRtk) {
        console.log('  Still loading, waiting 5 more seconds...');
        await new Promise(r => setTimeout(r, 5000));
        hasRtk = await cdpEval(ws, `!!window.rtk`);
    }
    if (!hasRtk) throw new Error('RTK API not available');
    console.log('✅ RTK API ready');

    // Start new game
    console.log('\n🎮 Starting new game as Dong Zhuo (Scenario 1)...');
    await cdpEval(ws, `window.rtk.newGame(0, 0)`);
    await new Promise(r => setTimeout(r, 1500));
    await cdpEval(ws, `(() => { while (window.rtk.query.pendingEvents().length > 0) window.rtk.confirmEvent(); return 'ok'; })()`);

    // Check state
    const stateStr = await cdpEval(ws, `JSON.stringify({
    phase: window.rtk.phase(),
    date: window.rtk.query.date(),
    luoyang: (() => { try { const c = window.rtk.query.cityDetails(10); return {name:c.name, troops:c.troops}; } catch(e) { return {error: e.message}; } })(),
    officers: window.rtk.query.myOfficers().filter(o => o.cityId === 10).slice(0,5).map(o => ({name:o.name, id:o.id, war:o.war, lead:o.leadership, stam:o.stamina})),
    chenliu: (() => { try { const c = window.rtk.query.cityDetails(13); return {name:c.name, troops:c.troops}; } catch(e) { return {error: e.message}; } })()
  })`);
    const state = JSON.parse(stateStr);
    console.log('Phase:', state.phase, '| Date:', state.date);
    console.log('Luoyang:', state.luoyang);
    console.log('Chenliu:', state.chenliu);
    console.log('Officers:');
    state.officers.forEach(o => console.log(`  ${o.name}: war=${o.war} lead=${o.lead} stam=${o.stam}`));

    // Build up troops
    console.log('\n⚔️ Building up troops...');
    const buildResult = await cdpEval(ws, `(() => {
    const api = window.rtk;
    api.selectCity(10);
    const logs = [];
    for (let i = 0; i < 8; i++) {
      try { 
        const r = api.draftTroops(10, 10000); 
        logs.push('Draft: ' + JSON.stringify(r));
      } catch(e) { logs.push('Draft err: ' + e.message); }
      try { api.endTurn(); } catch(e) { logs.push('EndTurn err: ' + e.message); }
      while (api.query.pendingEvents().length > 0) api.confirmEvent();
      if (api.phase() === 'battle') {
        logs.push('BATTLE PHASE - enemy attacked!');
        // Auto-resolve by waiting
        const b = api.battle;
        for (let j = 0; j < 3000; j++) {
          if (b.isFinished()) break;
          const a = b.activeUnit();
          if (!a) break;
          if (a.id.startsWith('defender')) {
            const t = b.attackTargets(a.id);
            if (t && t.length > 0) { b.attack(a.id, t[0].id); }
            else { b.wait(a.id); }
          } else {
            b.wait(a.id);
          }
        }
        while (api.query.pendingEvents().length > 0) api.confirmEvent();
        logs.push('Battle resolved, phase: ' + api.phase());
      }
    }
    const c = api.query.cityDetails(10);
    return JSON.stringify({logs: logs.slice(-5), troops: c.troops, date: api.query.date(), phase: api.phase()});
  })()`);
    const build = JSON.parse(buildResult);
    console.log('Date:', build.date, '| Phase:', build.phase);
    console.log('Luoyang troops:', build.troops);

    // Prepare battle
    console.log('\n🗡️ Setting formation and attacking Chenliu...');
    const attackResult = await cdpEval(ws, `(() => {
    const api = window.rtk;
    if (api.phase() !== 'playing') return JSON.stringify({error: 'Phase is ' + api.phase()});
    
    const officers = api.query.myOfficers().filter(o => o.cityId === 10 && o.stamina >= 30).sort((a,b) => b.war - a.war);
    if (officers.length === 0) return JSON.stringify({error: 'No officers with stamina'});
    
    const top = officers.slice(0, Math.min(3, officers.length));
    const cityTroops = api.query.cityDetails(10).troops;
    
    api.selectCity(10);
    api.setBattleFormation({
      officerIds: top.map(o => o.id),
      unitTypes: top.map(() => 'infantry')
    });
    
    // Find a target city that belongs to an enemy
    const enemyCities = [13, 7, 8, 14, 15, 16]; // Chenliu and nearby
    let targetId = null;
    for (const cid of enemyCities) {
      try {
        const c = api.query.cityDetails(cid);
        if (c && c.factionId && c.factionId !== api.query.myFaction().id) {
          targetId = cid;
          break;
        }
      } catch(e) {}
    }
    if (!targetId) return JSON.stringify({error: 'No valid target city found'});
    
    const targetCity = api.query.cityDetails(targetId);
    api.startBattle(targetId);
    
    return JSON.stringify({
      phase: api.phase(),
      target: targetCity.name,
      targetTroops: targetCity.troops,
      cityTroopsBefore: cityTroops,
      officers: top.map(o => ({name: o.name, war: o.war, lead: o.leadership})),
      expectedPerOfficer: Math.min(Math.floor(cityTroops / top.length), top[0].leadership * 100)
    });
  })()`);
    const attack = JSON.parse(attackResult);

    if (attack.error) {
        console.log('❌ Error:', attack.error);
    } else {
        console.log('Target:', attack.target, '(troops:', attack.targetTroops + ')');
        console.log('City troops before:', attack.cityTroopsBefore);
        console.log('Expected per officer:', attack.expectedPerOfficer);
        console.log('Phase:', attack.phase);

        // KEY TEST: Check troop allocation
        if (attack.phase === 'battle') {
            console.log('\n📊 === TROOP ALLOCATION CHECK ===');
            const unitsStr = await cdpEval(ws, `JSON.stringify(window.rtk.battle.units().map(u => ({
        id: u.id, officer: u.officer.name, troops: u.troops, maxTroops: u.maxTroops, type: u.type,
        side: u.id.startsWith('attacker') ? 'ATK' : 'DEF'
      })))`);
            const units = JSON.parse(unitsStr);

            let allDefault = true;
            units.forEach(u => {
                const flag = u.troops === 5000 ? ' ⚠️ DEFAULT' : ' ✅';
                if (u.troops !== 5000) allDefault = false;
                console.log(`  ${u.side} ${u.officer}: ${u.troops} troops (${u.type})${flag}`);
            });
            console.log(allDefault ? '\n❌ BUG: All troops still 5000!' : '\n✅ FIX CONFIRMED: Troops based on garrison!');

            // Fight the battle
            console.log('\n⚔️ Fighting battle...');
            const fightStr = await cdpEval(ws, `(() => {
        const b = window.rtk.battle;
        const log = [];
        for (let i = 0; i < 3000; i++) {
          if (b.isFinished()) { log.push('FINISHED day ' + b.day() + ' winner: ' + b.winner()); break; }
          const a = b.activeUnit();
          if (!a) { log.push('No active unit'); break; }
          if (a.id.startsWith('attacker')) {
            const t = b.attackTargets(a.id);
            if (t && t.length > 0) {
              t.sort((x,y) => x.troops - y.troops);
              b.attack(a.id, t[0].id);
              if (log.length < 25) log.push('D' + b.day() + ' ' + a.officer.name + '(' + a.troops + ') ATK ' + t[0].officer.name + '(' + t[0].troops + ')');
            } else {
              const g = b.gateTargets(a.id);
              if (g && g.length > 0) {
                b.attackGate(a.id, g[0].q, g[0].r);
                if (log.length < 25) log.push('D' + b.day() + ' ' + a.officer.name + '(' + a.troops + ') GATE');
              } else {
                const r = b.moveRange(a.id);
                if (r && r.length > 0) {
                  const defs = b.units().filter(u => u.id.startsWith('defender') && u.troops > 0);
                  if (defs.length > 0) {
                    r.sort((m,n) => (Math.abs(m.q-defs[0].x)+Math.abs(m.r-defs[0].y)) - (Math.abs(n.q-defs[0].x)+Math.abs(n.r-defs[0].y)));
                    b.move(a.id, r[0].q, r[0].r);
                  }
                }
                b.wait(a.id);
              }
            }
          } else { b.wait(a.id); }
        }
        return JSON.stringify({
          finished: b.isFinished(), winner: b.winner(), day: b.day(), log,
          survivors: b.units().filter(u => u.troops > 0).map(u => ({name: u.officer.name, troops: u.troops, side: u.id.startsWith('attacker')?'ATK':'DEF'}))
        });
      })()`);
            const fight = JSON.parse(fightStr);
            fight.log.forEach(l => console.log('  ' + l));
            console.log(`\n🏁 Result: ${fight.finished ? 'Battle ended' : 'Still fighting'} on day ${fight.day}`);
            console.log('Winner faction:', fight.winner);
            console.log('Survivors:');
            fight.survivors.forEach(u => console.log(`  ${u.side} ${u.name}: ${u.troops}`));
        } else if (attack.phase === 'playing') {
            console.log('🏰 City was auto-captured (no defenders)!');
        }

        // Confirm events
        await cdpEval(ws, `(() => { while (window.rtk.query.pendingEvents().length > 0) window.rtk.confirmEvent(); return 'ok'; })()`);

        const finalStr = await cdpEval(ws, `JSON.stringify({
      phase: window.rtk.phase(),
      myCities: window.rtk.query.myCities().map(c => ({name: c.name, troops: c.troops})),
      caoCao: window.rtk.query.factionCities(1).map(c => ({name: c.name, troops: c.troops}))
    })`);
        const final = JSON.parse(finalStr);
        console.log('\n📋 Final State:');
        console.log('Phase:', final.phase);
        console.log('My cities:', final.myCities.map(c => `${c.name}(${c.troops})`).join(', '));
        console.log('Cao Cao:', final.caoCao.length > 0 ? final.caoCao.map(c => `${c.name}(${c.troops})`).join(', ') : '🎉 ELIMINATED!');
    }

    ws.close();
} catch (e) {
    console.error('💥 Error:', e.message);
} finally {
    chrome.kill();
    try { execSync(`lsof -ti :${CDP_PORT} | xargs kill -9 2>/dev/null`); } catch { }
}
