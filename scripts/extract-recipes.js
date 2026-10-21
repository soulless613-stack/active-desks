#!/usr/bin/env node

/**
 * Recipe Extractor entry point (delegates to Universal Extractor)
 * Maintains backwards compatibility for any direct invocations or legacy workflows.
 */

import { runUniversalExtractor } from './universal-extractor.js';
import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runUniversalExtractor().catch(err => {
    console.error('Fatal unhandled error in extract-recipes:', err);
    process.exit(1);
  });
}
