import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { HttpConsoleProvider, useHttpConsole } from '../../contexts/HttpConsoleContext';

const Harness: React.FC = () => {
  const c = useHttpConsole();
  return (
    <div>
      <button onClick={() => c.open()}>open</button>
    </div>
  );
};

describe('HttpConsole dock', () => {
  it('open() 后应展示悬浮控制台并可收起', async () => {
    // Ensure fetch exists for the patching logic when enabled.
    (globalThis as any).fetch = vi.fn(async () => {
      return {
        status: 200,
        clone: () => ({ text: async () => 'ok' }),
        text: async () => 'ok'
      } as any;
    });

    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <HttpConsoleProvider>
          <Harness />
        </HttpConsoleProvider>
      </LanguageProvider>
    );

    expect(screen.queryByLabelText('http-console-dock')).toBeNull();

    await user.click(screen.getByText('open'));

    // Expanded view renders ConsoleView title (zh-SG default).
    expect(await screen.findByText('控制台')).toBeTruthy();

    await user.click(screen.getByLabelText('console-minimize'));
    expect(await screen.findByLabelText('http-console-dock')).toBeTruthy();
  });
});

