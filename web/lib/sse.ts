// Helper to turn an async iterator into a Server-Sent Events response.

export function sseStream<T>(iter: AsyncIterable<T>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        for await (const ev of iter) {
          const data = typeof ev === 'string' ? ev : JSON.stringify(ev);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(encoder.encode(`event: end\ndata: {}\n\n`));
        controller.close();
      } catch (err) {
        const msg = String((err as any)?.message ?? err);
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`));
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
