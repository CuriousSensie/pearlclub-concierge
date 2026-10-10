import type { InferUITools, UIDataTypes, UIMessage } from "ai";
// Type-only import: erased at build time, so no server code reaches the browser bundle.
import type { ConciergeTools } from "@/server/ai/tools";

/** A chat message whose tool parts are typed from the server's tool definitions. */
export type ConciergeUIMessage = UIMessage<unknown, UIDataTypes, InferUITools<ConciergeTools>>;
