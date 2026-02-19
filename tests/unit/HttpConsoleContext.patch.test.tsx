import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, renderHook } from '@testing-library/react';
import { HttpConsoleProvider, useHttpConsole } from '../../contexts/HttpConsoleContext';
import { LanguageProvider } from '../../contexts/LanguageContext';

// Mock HttpConsoleDock to avoid rendering it
vi.mock('../../features/wallet/components/ConsoleView', () => ({
    ConsoleView: () => <div>ConsoleView</div>,
    HttpConsoleDock: () => <div>Dock</div>
}));

// Test component to access context
const TestComponent = () => {
    const { setEnabled, events, clear } = useHttpConsole();
    return (
        <div>
            <button onClick={() => setEnabled(true)}>Enable</button>
            <button onClick={clear}>Clear</button>
            <div data-testid="count">{events.length}</div>
            <div data-testid="last-method">{events[0]?.method}</div>
            <div data-testid="last-url">{events[0]?.url}</div>
        </div>
    );
};

describe('HttpConsoleContext Patching', () => {
    let originalFetch: any;
    let originalXhr: any;

    // Mock XHR class
    class MockXHR {
        addEventListener = vi.fn();
        setRequestHeader = vi.fn();
        status = 200;
        responseText = '{"mock": "xhr"}';
    }

    let originalProtoOpen: any;

    beforeEach(() => {
        originalFetch = window.fetch;
        originalXhr = window.XMLHttpRequest;

        // Define prototype methods (MockXHR instance methods)
        (MockXHR.prototype as any).open = vi.fn();
        (MockXHR.prototype as any).send = vi.fn();
        // Mimic addEventListener as well if patched? No, only open/send patched.

        window.XMLHttpRequest = MockXHR as any;
        originalProtoOpen = (MockXHR.prototype as any).open;

        // However, HttpConsoleContext patches XMLHttpRequest.prototype.
        // If I replace window.XMLHttpRequest with a class that doesn't have the same prototype chain behavior 
        // as the one HttpConsoleContext expects (it patches XMLHttpRequest.prototype directly), it might fail.
        // HttpConsoleContext does: const proto = XMLHttpRequest.prototype; 

        // If I say window.XMLHttpRequest = MockXHR, then XMLHttpRequest.prototype is MockXHR.prototype.
        // So HttpConsoleContext will patch MockXHR.prototype.
        // Then when TestComponent creates new XMLHttpRequest(), it gets new MockXHR().
        // Its 'open' method will be the PATCHED one.
        // The patched one calls 'origXhrOpenRef' which is 'MockXHR.prototype.open'.
        // So I need MockXHR.prototype.open to be a function.
        // Class methods are on prototype.
    });

    afterEach(() => {
        window.fetch = originalFetch;
        window.XMLHttpRequest = originalXhr;
        vi.restoreAllMocks();
    });

    it('should patch fetch and capture requests when enabled', async () => {
        const mockFetch = vi.fn().mockResolvedValue(new Response('{"json":true}'));
        window.fetch = mockFetch;

        render(
            <LanguageProvider>
                <HttpConsoleProvider>
                    <TestComponent />
                </HttpConsoleProvider>
            </LanguageProvider>
        );

        // Enable console
        await act(async () => {
            screen.getByText('Enable').click();
        });

        // Current fetch should be patched
        expect(window.fetch).not.toBe(originalFetch);

        // Perform a fetch
        await act(async () => {
            await window.fetch('https://api.example.com/data', {
                method: 'POST',
                body: JSON.stringify({ method: 'eth_chainId', params: [] })
            });
        });

        // Verify underlying fetch called
        expect(mockFetch).toHaveBeenCalled();

        // Verify event captured
        expect(screen.getByTestId('count')).toHaveTextContent('1');
        expect(screen.getByTestId('last-method')).toHaveTextContent('POST');
        expect(screen.getByTestId('last-url')).toHaveTextContent('https://api.example.com/data');
    });

    it('should patch XMLHttpRequest and capture requests when enabled', async () => {
        render(
            <LanguageProvider>
                <HttpConsoleProvider>
                    <TestComponent />
                </HttpConsoleProvider>
            </LanguageProvider>
        );

        await act(async () => {
            screen.getByText('Enable').click();
        });

        // Create XHR
        const xhr = new XMLHttpRequest();
        vi.spyOn(xhr, 'addEventListener'); // Spy to check if loadend attached (internal detail)

        await act(async () => {
            xhr.open('GET', 'https://xhr.example.com');
            xhr.send();

            // Find the 'loadend' listener
            // addEventListener(type, listener, options)
            const call = (xhr.addEventListener as any).mock.calls.find((c: any) => c[0] === 'loadend');
            if (call) {
                const listener = call[1];
                if (typeof listener === 'function') { // EventListener or EventListenerObject
                    listener(new Event('loadend'));
                } else if (listener && typeof listener.handleEvent === 'function') {
                    listener.handleEvent(new Event('loadend'));
                }
            }
        });

        expect(screen.getByTestId('count')).toHaveTextContent('1');
        expect(screen.getByTestId('last-url')).toHaveTextContent('https://xhr.example.com');
    });

    it('should restore original fetch and XHR on unmount', async () => {
        const { unmount } = render(
            <LanguageProvider>
                <HttpConsoleProvider>
                    <TestComponent />
                </HttpConsoleProvider>
            </LanguageProvider>
        );

        await act(async () => {
            screen.getByText('Enable').click();
        });

        expect(window.fetch).not.toBe(originalFetch);
        unmount();
        // Fetch is bound so identity might differ, but checking XHR prototype
        expect(XMLHttpRequest.prototype.open).toBe(originalProtoOpen);
    });

    it('should handle RPC batch requests correctly', async () => {
        const mockFetch = vi.fn().mockResolvedValue(new Response('[{"id":1, "result":"0x1"}, {"id":2, "result":"0x2"}]'));
        window.fetch = mockFetch;

        render(
            <LanguageProvider>
                <HttpConsoleProvider>
                    <TestComponent />
                </HttpConsoleProvider>
            </LanguageProvider>
        );

        await act(async () => {
            screen.getByText('Enable').click();
        });

        await act(async () => {
            await window.fetch('https://rpc.example.com', {
                method: 'POST',
                body: JSON.stringify([
                    { method: 'eth_blockNumber', id: 1 },
                    { method: 'eth_gasPrice', id: 2 }
                ])
            });
        });

        // Should produce 2 events (one for each batch item)
        // pushEvent prepends, so we expect 2 events.
        // Wait, logic: for (i=batchSize-1; i>=0; i--) pushEvent(...).
        // It pushes them in reverse order to the events array?
        // pushEvent uses `setEvents(prev => [ev, ...prev])`.
        // If I push 1 then 0.
        // Events = [0, 1].
        expect(await screen.findByTestId('count')).toHaveTextContent('2');
    });

    it('should handle fetch errors gracefully', async () => {
        const mockFetch = vi.fn().mockRejectedValue(new Error('Network Error'));
        window.fetch = mockFetch;

        render(
            <LanguageProvider>
                <HttpConsoleProvider>
                    <TestComponent />
                </HttpConsoleProvider>
            </LanguageProvider>
        );

        await act(async () => {
            screen.getByText('Enable').click();
        });

        await expect(window.fetch('https://fail.com')).rejects.toThrow('Network Error');

        await waitFor(() => {
            expect(screen.getByTestId('count')).toHaveTextContent('1');
        });
    });
});
