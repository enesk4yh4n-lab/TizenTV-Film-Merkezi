'use strict';
// Real-TV entry point for the runner. Emulator reports are never overwritten.
const cp=require('node:child_process'),path=require('node:path');
const cases=(process.env.SITES180_TV_CASES||'case-12').split(',').filter(Boolean);
const catalog=process.env.SITES180_TV_KIND==='catalog';
const result=cp.spawnSync(process.execPath,[path.join(__dirname,catalog?'emulator-catalog.cjs':'emulator-playback.cjs'),...(catalog?[]:cases)],{stdio:'inherit',env:{...process.env,TIZEN_CDP_PORT:'35963',SITES180_PHYSICAL_TV:'1',SITES180_PLAYBACK_REPORT:'tv-playback.json',SITES180_CATALOG_REPORT:'tv-catalog.json'}});
process.exitCode=result.status===null?1:result.status;
