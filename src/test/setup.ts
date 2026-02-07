import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mocking some globals if needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).jest = vi as any;
