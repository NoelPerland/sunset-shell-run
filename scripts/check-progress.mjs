import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const functions=source.slice(source.indexOf('function getCompletedLevels()'),source.indexOf('class SoundBank'));
for(const saved of ['[0,2]','null','{}','[0,-1,4,1.5,"1"]','invalid']) {
 const context=vm.createContext({sessionCompleted:new Set(),LEVELS:Array(4),COMPLETED_KEY:'save',localStorage:{getItem:()=>saved,setItem:()=>{throw Error('full')}}});
 vm.runInContext(functions,context);
 const actual=Array.from(vm.runInContext('getCompletedLevels()',context));
 assert.deepEqual(actual,saved==='[0,2]'?[0,2]:saved.startsWith('[0,-1')?[0]:[]);
 assert.doesNotThrow(()=>vm.runInContext('saveCompletedLevel(1)',context));
 assert(vm.runInContext('getCompletedLevels().has(1)',context));
}
console.log('Progress handles malformed saves and unavailable storage.');
