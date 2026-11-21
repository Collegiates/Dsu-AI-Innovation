// Adds readable checks such as expect(element).toBeInTheDocument() to every component test,
// and clears rendered components between tests so one test can't affect the next.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
