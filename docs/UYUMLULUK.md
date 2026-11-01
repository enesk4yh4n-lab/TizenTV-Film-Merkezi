# Compatibility evidence

| Platform | Actual evidence | Limitation |
| --- | --- | --- |
| Real Samsung UE55MU7500, Tizen 3.0, firmware 1410 | 1.1.7 automated catalog/player/refresh, YouTube startup and AVPlay reference-clip checks; earlier builds had user-confirmed picture/audio/sync/remote | FixFull buffering and two test-session interruptions remain; final header/source-notice edits checked separately on desktop |
| WSL Samsung Tizen 3.0 emulator | Previous development builds ran and were exercised | v1.0.0 not freshly installed in this release preparation |
| Samsung Tizen 8/9 Windows emulators | Earlier Samsung-signed packages installed; automatic timing/control checks passed | User reported audio without picture and Resource Allocation Failure; unresolved |
| Samsung Tizen 10 emulator | Earlier Samsung-signed package installed; automatic playback clock/control checks passed | Not complete visible-picture, audible-sound or real-TV acceptance |
| Tizen 4–7 | Manifest targets minimum 3.0 | Not tested |
| Desktop Chrome | Focused 1.1.7 static, header/language/site, current filter and FixFull checks | Does not establish TV codec/hardware support |

Samsung certificate installation and successful video decoding are separate. Apps2Samsung signs the public WGT for the destination TV; this does not guarantee every codec or stream works. First-launch consent, About/credits and package privacy have separate public-package checks. The application is a community package, not an officially Samsung-certified/store-approved application.
