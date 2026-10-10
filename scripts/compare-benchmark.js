import { execFileSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { readdirSync, statSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const react = '/home/dkinkead/ligature-react-benchmark'
const trials = Math.max(1, Number(process.env.BENCHMARK_TRIALS || 10))
function sourceStats(dir) { let files = 0; let lines = 0; function walk(p) { for (const name of readdirSync(p)) { const f=path.join(p,name); const s=statSync(f); if (name==='node_modules'||name==='.git') continue; if (s.isDirectory()) walk(f); else if (/\.(js|jsx|json|css|html|md)$/.test(name)) { files++; lines += (requireLines(f)) } } } walk(dir); return { files, lines } }
function requireLines(file) { try { return readFileSync(file,'utf8').split('\n').length } catch { return 0 } }
function timed(kind) { const start=performance.now(); try { execFileSync(process.execPath,[path.join(root,'scripts/benchmark-worker.js'),kind],{cwd:root,stdio:'pipe',timeout:30000,killSignal:'SIGTERM'}); return { ok:true, ms:Number((performance.now()-start).toFixed(2)) } } catch (error) { return { ok:false, ms:Number((performance.now()-start).toFixed(2)), error: String(error.stderr || error.stdout || error.message).slice(-1000) } } }
function stats(runs) { const values=runs.filter(run=>run.ok).map(run=>run.ms).sort((a,b)=>a-b); if (!values.length) return { trials:runs.length, passed:0, failed:runs.length }; const mean=values.reduce((a,b)=>a+b,0)/values.length; const variance=values.reduce((a,b)=>a+(b-mean)**2,0)/values.length; return { trials:runs.length, passed:values.length, failed:runs.length-values.length, minMs:values[0], medianMs:values[Math.floor(values.length/2)], meanMs:Number(mean.toFixed(2)), maxMs:values.at(-1), stddevMs:Number(Math.sqrt(variance).toFixed(2)), failures:runs.filter(run=>!run.ok).map(run=>run.error) } }
function benchmarkApp(name, cwd) { const runs=Array.from({length:trials},()=>timed(name)); return { name, root:cwd, source:sourceStats(name==='ligature'?path.join(cwd,'example'):cwd), browserWorkflow:stats(runs) } }
const report = { generatedAt: new Date().toISOString(), trials, apps: { ligature: benchmarkApp('ligature', root), react: benchmarkApp('react', react) }, interpretation: 'Browser timings include process startup and Chromium. Source counts exclude node_modules and are descriptive, not quality scores. This is an implementation comparison, not a universal framework performance claim.' }
console.log(JSON.stringify(report,null,2))
