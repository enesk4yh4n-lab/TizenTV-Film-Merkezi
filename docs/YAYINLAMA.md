# Release procedure

Run `npm ci`, `npm test` and `python scripts/build.py`. The public WGT is unsigned on purpose: the recipient's installer obtains a device-authorized certificate and re-signs it. Never upload a private signing profile, password or user records.

Attach `Film-Merkezi-TV-1.1.7-public.wgt`, `Film-Merkezi-Kaynak-1.1.7.zip`, `Film-Merkezi-Kaynak-Tam-1.1.7.zip`, `SHA256SUMS.txt` and the static scan report to release **v1.1.7**. The native/decoder source ZIP carries the original MPL CA source and must remain available wherever the WGT is distributed. Source notices in the WGT identify these download locations.

The community manifest must select the public WGT through `assets[].match`; the release has several assets and the catalog's single-file shortcut would be ambiguous. Keep category `streaming`. The 1.1.7 update requests `adult: false` because the application includes adult-content filtering and is not intended as an adult-content catalog; maintainers decide the final classification. Do not set root or per-user API-key settings: this application needs neither.

The catalog entry is already included. Only Apps2Samsung maintainers can merge classification/description changes after their normal checks. A release or open PR does not mean a proposed classification change has been distributed.


The community catalog already contains this repository. New stable releases use its existing asset pattern. Adult-classification changes require a separate manifest PR and maintainer acceptance.
