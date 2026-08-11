/**
 * Wave divider — both layers are solid `bg-*` (CSS mask for the scallop).
 * Avoids SVG fill stretch banding / color offsets.
 * `from` = peaks (previous band), `to` = scallops (next band)
 */
export default function Wave({
  from = "bg-canvas",
  to = "bg-ink",
}: {
  from?: string;
  to?: string;
}) {
  return (
    <div className={"wave-divider " + from} aria-hidden>
      <div className={"wave-divider__scallop " + to} />
    </div>
  );
}
