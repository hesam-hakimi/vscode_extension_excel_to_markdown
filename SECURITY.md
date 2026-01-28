# Security

## Threat Model
- **Untrusted workbook content**: User may open malicious `.xlsx`/`.xlsm` files. Risk: macro execution, formula execution, prototype pollution or ReDoS in parsers.
- **Path traversal / overwrite**: Malicious sheet names or paths could try to write files outside the chosen directory.
- **Resource exhaustion**: Very large sheets could block the extension host or create huge outputs.

## Mitigations
- Uses SheetJS `xlsx` in data-only mode: no macro or formula execution; styles and number formats are ignored.
- Accepts only `.xlsx` by default; `.xlsm` must be explicitly enabled. Regardless, macros are never run.
- Sheet names and filenames are sanitized; `ensureWithinDirectory` blocks writing outside the user-chosen folder.
- Row/column limits are configurable and clamped to sane bounds to reduce DoS risk; warnings are surfaced when truncation occurs.
- No dynamic code execution (`eval`, `Function`, child processes) is used.
- Progress UI supports user cancellation.

## Known Issues
- Upstream advisory: `xlsx@0.18.5` has prototype pollution/ReDoS findings with crafted XML. Current release has no patched version; scope is limited by treating workbooks as untrusted data only and enforcing row/column limits. Monitor SheetJS releases for fixes.

## Reporting
If you discover a security issue, please open a private security advisory or contact the maintainer before disclosing publicly.
