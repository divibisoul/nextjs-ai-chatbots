import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const manifest=JSON.parse(fs.readFileSync(process.env.FORENSIC_MANIFEST||'docs/forensics/n04-manifest.json','utf8'));
const root=process.cwd(),skip=new Set(['.git','node_modules','.next','dist','build','coverage']),files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(e.name))continue;const f=path.join(dir,e.name);e.isDirectory()?walk(f):files.push(path.relative(root,f));}}walk(root);
const textFiles=files.filter(f=>!/[.]?(png|jpe?g|gif|webp|ico|pdf|zip|gz|woff2?|ttf)$/i.test(f));
const contents=new Map();for(const f of textFiles){try{contents.set(f,fs.readFileSync(path.join(root,f),'utf8'))}catch{}}
function sh(cmd,args){try{return{ok:true,stdout:execFileSync(cmd,args,{cwd:root,encoding:'utf8'})}}catch(e){return{ok:false,error:String(e?.stderr||e?.message||e)}}}
const refs=sh('git',['for-each-ref','--format=%(refname)','refs/heads','refs/remotes/origin','refs/tags']);
const history=sh('git',['log','--all','--name-only','--format=%H']);
const stash=sh('git',['stash','list']);
const prs=sh('gh',['pr','list','--state','all','--limit','100','--json','number,title,url,headRefName,baseRefName']);
const backups=files.filter(f=>/(^|[/])(?:backup|backups|archive|archives|snapshot|snapshots)(?:[/]|$)/i.test(f));
const match=(x,t)=>x.ok&&t.terms.some(k=>x.stdout.toLowerCase().includes(k.toLowerCase()));
const results=manifest.targets.map(t=>{const pathHits=files.filter(f=>t.paths.some(p=>f===p||f.startsWith(p+'/'))&&t.terms.some(k=>f.toLowerCase().includes(k.toLowerCase())));const contentHits=[];for(const[f,txt]of contents){if(!t.paths.some(p=>f===p||f.startsWith(p+'/')))continue;const terms=t.terms.filter(k=>txt.toLowerCase().includes(k.toLowerCase()));if(terms.length)contentHits.push({file:f,terms});}const any=pathHits.length||contentHits.length||match(refs,t)||match(history,t)||match(prs,t);return{id:t.id,status:any?'FOUND':'NOT_FOUND_IN_AVAILABLE_SOURCES',sevenSources:{main_path_scan:{status:'MEASURED',hits:pathHits.slice(0,50)},content_scan:{status:'MEASURED',hits:contentHits.slice(0,50)},all_refs:{status:refs.ok?'MEASURED':'BLOCKED',match:match(refs,t)},git_history:{status:history.ok?'MEASURED':'BLOCKED',match:match(history,t)},pull_requests:{status:prs.ok?'MEASURED':'BLOCKED',match:match(prs,t)},stash:{status:stash.ok?'MEASURED':'BLOCKED',present:Boolean(stash.stdout?.trim())},repository_backups:{status:backups.length?'MEASURED':'NOT_CONFIGURED_IN_CHECKOUT',match:backups.some(f=>t.terms.some(k=>f.toLowerCase().includes(k.toLowerCase())))}}}});
fs.mkdirSync('artifacts',{recursive:true});const report={generatedAt:new Date().toISOString(),repository:manifest.repository,nucleus:manifest.nucleus,branch:sh('git',['branch','--show-current']).stdout.trim(),head:sh('git',['rev-parse','HEAD']).stdout.trim(),totalFilesScanned:textFiles.length,results};fs.writeFileSync('artifacts/forensic-audit-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
