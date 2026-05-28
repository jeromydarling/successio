/**
 * ProcessingStateDO — per-org real-time processing state.
 *
 * Each org gets its own DO instance (keyed by orgId).
 * Clients connect via GET /stream and receive SSE events.
 * The score worker notifies via POST /broadcast.
 *
 * Registration: wrangler.toml [[durable_objects.bindings]]
 * Export: this class must be re-exported from the worker entry point.
 */

export class ProcessingStateDO {
  private state: DurableObjectState;
  private writers = new Set<ReadableStreamDefaultController>();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // SSE stream — client subscribes here
    if (req.method === "GET" && url.pathname.endsWith("/stream")) {
      const encoder = new TextEncoder();
      let controller!: ReadableStreamDefaultController;

      const stream = new ReadableStream({
        start: (ctrl) => {
          controller = ctrl;
          this.writers.add(ctrl);
          // Send initial keepalive
          ctrl.enqueue(encoder.encode(": keepalive\n\n"));
        },
        cancel: () => {
          this.writers.delete(controller);
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Broadcast — score worker posts here after each pipeline run
    if (req.method === "POST" && url.pathname.endsWith("/broadcast")) {
      const payload = await req.text();
      const encoder = new TextEncoder();
      const msg = encoder.encode(`data: ${payload}\n\n`);

      const dead: ReadableStreamDefaultController[] = [];
      for (const ctrl of this.writers) {
        try {
          ctrl.enqueue(msg);
        } catch {
          dead.push(ctrl);
        }
      }
      for (const ctrl of dead) this.writers.delete(ctrl);

      return new Response("ok");
    }

    return new Response("not found", { status: 404 });
  }
}

/**
 * DealRoomDO — tracks deal room session access per share token.
 * Stub for Phase 5.
 */
export class DealRoomDO {
  constructor(private state: DurableObjectState) {}

  async fetch(req: Request): Promise<Response> {
    return new Response("deal room stub", { status: 200 });
  }
}
