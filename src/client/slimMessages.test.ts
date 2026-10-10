import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { slimMessages } from "./slimMessages";

const place = {
  id: "p1",
  name: "Hjem",
  description: "x".repeat(500),
  image_url: "https://img/x.jpg",
  curator_image: "https://img/c.jpg",
  pearlclub_url: "https://pearlclub.com/p1",
  lat: 51.5,
  lng: -0.1,
  tags: ["a"],
  category: "cafe",
};

const assistant = (output: unknown): UIMessage => ({
  id: "a",
  role: "assistant",
  parts: [
    { type: "text", text: "here" },
    { type: "tool-search_places", toolCallId: "t", state: "output-available", input: {}, output },
  ] as UIMessage["parts"],
});

describe("slimMessages", () => {
  it("drops heavy fields and truncates descriptions inside tool outputs", () => {
    const [message] = slimMessages([assistant({ places: [place] })]);
    const part = message.parts[1] as unknown as { output: { places: Record<string, unknown>[] } };
    const slim = part.output.places[0];
    expect(slim).not.toHaveProperty("image_url");
    expect(slim).not.toHaveProperty("curator_image");
    expect(slim).not.toHaveProperty("lat");
    expect(slim).not.toHaveProperty("tags");
    expect(slim).toMatchObject({ id: "p1", name: "Hjem", category: "cafe" });
    expect((slim.description as string).length).toBe(200);
  });

  it("keeps only the most recent messages", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: `m${i}`,
      role: "user" as const,
      parts: [{ type: "text" as const, text: String(i) }],
    }));
    const slim = slimMessages(many);
    expect(slim).toHaveLength(14);
    expect(slim.at(-1)?.id).toBe("m29");
  });

  it("leaves user messages and text parts untouched, and does not mutate the input", () => {
    const input = [assistant({ places: [place] })];
    slimMessages(input);
    expect(
      (input[0].parts[1] as unknown as { output: { places: unknown[] } }).output.places[0],
    ).toBe(place);
  });
});
