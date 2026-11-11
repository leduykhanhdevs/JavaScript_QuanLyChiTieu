# Third-party notices

This directory contains local browser assets used by the receipt-scanning feature.

## Tesseract.js

- Package: `tesseract.js@7.0.0`
- License: Apache-2.0
- Upstream: <https://github.com/naptha/tesseract.js>
- License text: `LICENSE-tesseract.js.md`

## Tesseract.js Core

- Package: `tesseract.js-core@7.0.0`
- License: Apache-2.0
- Upstream: <https://github.com/naptha/tesseract.js>
- License text: `LICENSE-tesseract.js-core`

## Vietnamese trained data

- Package metadata: `@tesseract.js-data/vie@1.0.0`, declared license MIT.
- Upstream model repository: <https://github.com/naptha/tessdata>, declared license Apache-2.0.
- Local package/readme metadata: `README-language-data.md`; trained data file: `lang/vie.traineddata.gz`.

The trained data is served from this application alongside the OCR worker and WebAssembly files; the application does not fetch these assets from a CDN at runtime. The MIT package metadata and the upstream model repository's Apache-2.0 license are both identified here for provenance.

The receipt image is processed in the browser and is not uploaded by this feature.
