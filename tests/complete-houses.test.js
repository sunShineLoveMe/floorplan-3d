import test from 'node:test';
import {fixture,fixtureProject} from './helpers/house-fixture.js';
import {auditHouse} from './helpers/audit-house.js';
for(const id of ['plan-b','plan-a','plan-c','plan-f'])test(id+': source outline, complete inventory and all spaces reachable',()=>auditHouse(fixtureProject(fixture(id)),fixture(id)));
