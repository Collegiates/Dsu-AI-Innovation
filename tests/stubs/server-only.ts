// Stand-in for the "server-only" package during unit tests.
// In the real app, "server-only" stops server code (like the Gemini client) from being sent to the browser.
// Tests run outside Next.js, so this empty file lets them import that server code.
export {};
