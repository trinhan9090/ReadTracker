import { test } from "node:test";
import assert from "node:assert/strict";
import { changes,reconcile,resolveConflict,snapshot,type SyncOperation } from "../src/sync.ts";
import { emptyState,type Book } from "../src/model.ts";
const book=(id:string,title=id):Book=>({id,title,author:"Author",total:100,position:0,completed:false,reflection:"",createdAt:1});
const base=()=>({...emptyState(),books:[book("a"),book("b")],cloudRevision:1});
test("different books merge without overwriting either device",()=>{const b=base();const local={...b,syncBase:snapshot(b),books:[book("a","PC"),book("b")]};const remote={...b,books:[book("a"),book("b","Android")],cloudRevision:2};const result=reconcile(local,remote);assert.equal(result.books.find(x=>x.id==='a')?.title,'PC');assert.equal(result.books.find(x=>x.id==='b')?.title,'Android');assert.equal(result.syncConflicts?.length,0);assert.equal(changes(result.syncBase!,result).length,1);});
test("same-record conflict preserves draft until an explicit choice",()=>{const b=base();const local={...b,syncBase:snapshot(b),books:[book('a','PC'),book('b')]};const remote={...b,books:[book('a','Android'),book('b')]};const result=reconcile(local,remote);assert.equal(result.books[0].title,'PC');assert.equal(result.syncConflicts?.length,1);const selected=resolveConflict(result,result.syncConflicts![0],false);assert.equal(selected.books.find(x=>x.id==='a')?.title,'Android');assert.equal(selected.syncConflicts?.length,0);});
test("acknowledgement preserves edits made during upload without false conflicts",()=>{const b=base();const sent=book('a','First edit');const op:SyncOperation={opId:'operation-001',kind:'books',id:'a',base:book('a'),value:sent};const local={...b,syncBase:snapshot(b),books:[book('a','Second edit'),book('b')]};const remote={...b,books:[sent,book('b')],cloudRevision:2};const merged=reconcile(local,remote,[op]);assert.equal(merged.books[0].title,'Second edit');assert.equal(merged.syncConflicts?.length,0);assert.equal(changes(merged.syncBase!,merged)[0].base?.title,'First edit');});
test("remote deletion cannot erase a concurrent local edit silently",()=>{const b=base();const local={...b,syncBase:snapshot(b),books:[book('a','Unsaved'),book('b')]};const result=reconcile(local,{...b,books:[book('b')]});assert.equal(result.syncConflicts?.[0].id,'a');assert.equal(result.books.find(x=>x.id==='a')?.title,'Unsaved');const kept=resolveConflict(result,result.syncConflicts![0],true);assert.equal(changes(kept.syncBase!,kept)[0].base,null);});
test("identical changes and JSON property order do not conflict",()=>{const b=base();const local={...b,syncBase:snapshot(b),books:[book('a','same'),book('b')]};const r=reconcile(local,{...b,books:[{...book('a','same')},book('b')]});assert.equal(r.cloudDirty,false);assert.equal(r.syncConflicts?.length,0);});
test("new session survives a remote parent deletion and waits for the book choice",()=>{
 const b=base();const session={id:'s',bookId:'a',start:0,end:10,seconds:300,date:'2026-09-11',note:'Keep this',createdAt:2};
 const merged=reconcile({...b,syncBase:snapshot(b),sessions:[session]},{...b,books:[book('b')],cloudRevision:2});
 assert.equal(merged.books.some(x=>x.id==='a'),true);assert.equal(merged.sessions[0].note,'Keep this');
 assert.equal(changes(merged.syncBase!,merged,merged.syncConflicts).length,0);
 const kept=resolveConflict(merged,merged.syncConflicts![0],true);
 assert.deepEqual(changes(kept.syncBase!,kept).map(x=>x.kind),['books','sessions']);
 const discarded=resolveConflict(merged,merged.syncConflicts![0],false);assert.equal(discarded.sessions.length,0);
});
test("remote trash cannot hide a newly recorded session without a choice",()=>{
 const b=base();const session={id:'s',bookId:'a',start:0,end:10,seconds:300,date:'2026-09-11',note:'new',createdAt:2};
 const merged=reconcile({...b,syncBase:snapshot(b),sessions:[session]},{...b,books:[{...book('a'),deletedAt:3},book('b')]});
 assert.equal(merged.books.find(x=>x.id==='a')?.deletedAt,undefined);assert.equal(merged.syncConflicts?.[0].kind,'books');
});
test("different sessions merge and a repeated merge is stable",()=>{
 const b=base();const s={id:'s',bookId:'a',start:0,end:10,seconds:300,date:'2026-09-11',note:'',createdAt:2};
 const remote={...b,sessions:[{...s,id:'r'}]};
 const merged=reconcile({...b,syncBase:snapshot(b),sessions:[s]},remote);
 assert.equal(merged.sessions.length,2);assert.equal(merged.syncConflicts?.length,0);
 assert.deepEqual(reconcile(merged,remote),merged);
});
