# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

**All guidelines, architecture notes, build commands, code style, and testing instructions are maintained in [AGENTS.md](./AGENTS.md).** Refer to that file for the canonical reference.

## Quick i18n Reminders

- All UI strings must use `t()` — never hardcode Chinese text
- All store log messages must use `i18next.t('logs:...')`
- All officer/city/faction names must use `localizedName()` from `src/i18n/dataNames.ts`
- Add keys to BOTH `zh-TW` and `en` locale files in `src/i18n/locales/`
- Run `npm test` to catch Chinese leaks via regression tests in `src/store/i18n-logs.test.ts`
