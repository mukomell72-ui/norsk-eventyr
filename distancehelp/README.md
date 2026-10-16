# DistanceHelp Android

Consent-based local screen-viewer for Android 8+.

The app requests Android screen sharing permission, then displays a temporary LAN URL to view the screen from a second phone connected to the same trusted Wi-Fi. The owner can stop from the app or ongoing notification. The session expires after 15 minutes.

**Security:** HTTP traffic is not encrypted, so use a trusted LAN only. Do not share URL publicly. The viewer cannot send taps, access files, or activate cameras/microphones.

**Installation:** Debug APK is published as `DistanceHelp.apk` in this isolated branch when the Android build succeeds. The app is not distributed on Play Store.

**Source:** `distancehelp/app/src/main/java/com/example/distancehelp`.
**Automation:** `.github/workflows/distancehelp-apk.yml`.

This branch does not modify the deployed Norsk Eventyr main branch.
