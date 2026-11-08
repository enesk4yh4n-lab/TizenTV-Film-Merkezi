'use strict';
// Real-TV entry point for the runner. Emulator reports are never overwritten.
const cp=require('node:child_process'),path=require('node:path');
const cases=(process.env.SITES180_TV_CASES||'case-12').split(',').filter(Boolean);
const result=cp.spawnSync(process.execPath,[path.join(__dirname,'emulator-playback.cjs'),...cases],{stdio:'inherit',env:{...process.env,TIZEN_CDP_PORT:'35963',SITES180_PHYSICAL_TV:'1',SITES180_PLAYBACK_REPORT:'tv-playback.json'}});
process.exitCode=result.status===null?1:result.status;
