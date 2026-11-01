# Film Merkezi 1.1.7

2 November 2026 · stable public distribution

FixFull sources now support the current player-tab format: active and lazy iframe URLs are read from their matching panels. The previous linked-source format remains supported. Unrelated/ad frames and mismatched panels are rejected; site scripts are not executed.

The application header displays **Film Merkezi v1.1.7** for the unified catalog and individual sites, including after switching interface languages. The version comes from the shared application version field.

This release also publishes the current changes since 1.0.0: first-launch language/merging preferences, optional catalog merging and the latest catalog/player fixes. The public source and WGT contain the same runtime. No new adult-filter implementation was added for this publication.

Katalogda yetişkin içerikleri göstermemeye yönelik filtreleme kullanılır. Film Merkezi yetişkin içerik kataloğu sunmayı amaçlamaz.

## Distribution

- Unsigned `Film-Merkezi-TV-1.1.7-public.wgt`, intended for Apps2Samsung's TV-authorized signing.
- `Film-Merkezi-Kaynak-1.1.7.zip`: native/decoder sources, exact MPL-2.0 Mozilla CA input and notices.
- `Film-Merkezi-Kaynak-Tam-1.1.7.zip`: complete public source snapshot and reproducible packaging tools.
- `SHA256SUMS.txt`: artifact checksums.

Application identity remains `FilmMerkez.FilmMerkezi`; minimum required Tizen remains 3.0. CSP, privileges, vendor/YouTube generated files and native executables were not changed by publication. Developer signatures, private keys, personal device configuration, logs and QA tools are not included in the WGT.

## Evidence and remaining issues

The 1.1.7 playback code was installed and automatically exercised on a real Samsung UE55MU7500, Tizen 3.0, firmware 1410. Final header/source-notice edits received focused desktop checks. No new TV installation or broad TV acceptance run was performed for this publication.

Some FixFull VIDMOLY/Matrudas streams still buffer when measured delivery falls below the selected bitrate. Two remote testing interruptions remain unresolved; neither proves an app crash or memory failure. Earlier emulator limitations on Tizen 8/9 and incomplete coverage of newer TVs remain. See [verification](DOGRULAMA_1.1.7.md) and [compatibility](UYUMLULUK.md).

The community catalog entry already exists. An update requests removal of the old adult classification; this is subject to maintainer review and catalog distribution. Publishing this release does not by itself change that label.
