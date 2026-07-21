import { resetEvidenceResults } from './ficosha/helpers';
import { resetTimings } from './jardin-azuayo/helpers';

export default function globalSetup() {
  const isJardin = process.env.E2E_SUITE === 'jardin-azuayo'
    || process.argv.some((a) => a.includes('jardin-azuayo'));

  if (isJardin) {
    resetTimings();
  } else {
    resetEvidenceResults();
  }
}
