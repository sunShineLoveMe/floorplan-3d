import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createScope} from '../src/ui/lifecycle.js';
test('disposing a component removes listeners and pending work before remount',async()=>{
 const target=new EventTarget();let calls=0;
 const mount=()=>{const scope=createScope();scope.on(target,'edit',()=>calls++);return scope;};
 const first=mount();target.dispatchEvent(new Event('edit'));assert.equal(calls,1);
 first.timeout(()=>assert.fail('disposed timer ran'),10);const pending=first.wait(10000);first.dispose();await pending;
 target.dispatchEvent(new Event('edit'));assert.equal(calls,1);
 const second=mount();target.dispatchEvent(new Event('edit'));assert.equal(calls,2);second.dispose();second.dispose();
});
