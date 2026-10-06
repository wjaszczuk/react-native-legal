# @callstack/example-license-apache-2.0-or-lgpl-3.0-and-mit-or-gpl-2.0

This is a test package with the license expression `(Apache-2.0 OR LGPL-3.0-only) AND (MIT OR GPL-2.0-only)` (two Dual Licenses combined with `AND`), for the needs of example tester projects in this monorepository to depend on, to test that license-kit parses, renders and classifies SPDX license expressions.

Expected category: strong copyleft with `--or-policy most-restrictive` (the default), permissive with `--or-policy least-restrictive`.
