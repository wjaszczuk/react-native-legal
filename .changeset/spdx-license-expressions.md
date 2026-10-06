---
'@callstack/licenses': major
'license-kit': major
'react-native-legal': minor
'@callstack/license-kit-visualizer': minor
---

Parse licenses as SPDX License Expressions. Classification follows the expression (`AND` takes the most restrictive operand, `OR` follows the new `--or-policy` option, `WITH` and `+` take the base license's category), unrecognised values are Unknown instead of permissive, and every license file of a package is collected. **Breaking:** `type`, `content` and `file` are removed from scanned entries and `report --format json`; use `rawLicense`, `license`, `licenseIds` and `licenseFiles`. `MIT OR GPL-3.0` style packages now fail `copyleft` by default; `--or-policy least-restrictive` restores the previous result. See the migration guide.
