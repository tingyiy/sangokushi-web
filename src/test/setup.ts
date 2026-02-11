import '@testing-library/jest-dom';
import { vi } from 'vitest';
import i18next from 'i18next';
import '../i18n';

// Force test environment to zh-TW so existing tests that match Chinese strings work.
// Tests that need a different locale can call i18next.changeLanguage() explicitly.
i18next.changeLanguage('zh-TW');

// Mocking some globals if needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).jest = vi as any;
