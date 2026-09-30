import * as Data from '../data/project-data.js';
import template from '../data/sample-template.js';
import {CATALOGS} from '../data/catalogs.js';
export const readProject = (raw, confirmed = false) => Data.read(raw, template, CATALOGS, confirmed);
export function prepareImport(raw, confirmed = false) {
  try { return {status:'ready', ...readProject(raw, confirmed)}; }
  catch (error) { return {status:error.code === 'LEGACY_CONFIRM_REQUIRED' ? 'confirmation-required' : 'error', error}; }
}
/** Validation and backup finish before the caller replaces its current project. */
export function importProject(raw, {confirmLegacy, backup, replace}) {
  let result = prepareImport(raw);
  if (result.status === 'confirmation-required') {
    if (!confirmLegacy()) return {status:'cancelled'};
    result = prepareImport(raw, true);
    if (result.status === 'ready') backup(raw);
  }
  if (result.status === 'error') throw result.error;
  if (result.status === 'ready') replace(result.project);
  return result;
}
export const serializeProject = project => JSON.stringify(Data.validate(project, CATALOGS), null, 2);
