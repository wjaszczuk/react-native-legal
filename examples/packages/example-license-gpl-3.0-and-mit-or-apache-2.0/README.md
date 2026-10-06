# @callstack/example-license-gpl-3.0-and-mit-or-apache-2.0

This is a test package with the license expression `GPL-3.0-only AND (MIT OR Apache-2.0)` (a strong copyleft license combined with `AND` with a Dual License; `AND` ignores the OR Policy), for the needs of example tester projects in this monorepository to depend on, to test that license-kit parses, renders and classifies SPDX license expressions.

Expected category: strong copyleft with `--or-policy most-restrictive` (the default), strong copyleft with `--or-policy least-restrictive`.
