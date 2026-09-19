export function maintainSerialLease({ renew, leaseSeconds, onError = () => {}, intervalMs = 5000 }) {
  const controller = new AbortController();
  let validUntil = Date.now() + leaseSeconds * 1000;
  let inFlight = null;
  let stopped = false;
  const pulse = () => {
    if (stopped || controller.signal.aborted) return;
    if (Date.now() >= validUntil) { controller.abort(); return; }
    if (inFlight) return;
    inFlight = (async () => {
      try {
        const result = await renew();
        if (!result.renewed) controller.abort();
        else validUntil = Date.now() + Number(result.leaseSeconds || leaseSeconds) * 1000;
      } catch (error) {
        onError(error);
        if (Date.now() >= validUntil) controller.abort();
      }
    })().finally(() => { inFlight = null; });
  };
  const timer = setInterval(pulse, intervalMs);
  timer.unref?.();
  return {
    signal: controller.signal,
    async stop() { stopped = true; clearInterval(timer); await inFlight; }
  };
}
