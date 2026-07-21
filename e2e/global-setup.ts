import { resetTimingsJson } from './ficosha/button-audit.helpers';
import { resetEvidenceResults } from './ficosha/helpers';

export default function globalSetup() {
  resetEvidenceResults();
  resetTimingsJson();
}
