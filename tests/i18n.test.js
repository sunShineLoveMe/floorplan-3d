import test from 'node:test';
import assert from 'node:assert/strict';
import {nm,setLanguage} from '../src/ui/i18n.js';
test('project names never acquire catalog translations, including exact dictionary matches',()=>{
 for(const language of ['en','zh','en']){
  setLanguage(language);
  for(const name of ['客厅','床头柜','My bedroom','客厅 & <custom>'])assert.equal(nm(name),name);
  assert.equal(nm('客厅',true),language==='en'?'Living Room':'客厅');
  assert.equal(nm('unlisted',true),'unlisted');
 }
});
