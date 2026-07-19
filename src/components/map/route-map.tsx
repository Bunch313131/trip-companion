'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Drawer } from 'vaul';
import 'maplibre-gl/dist/maplibre-gl.css';
import { StatusPill } from '@/components/ui/status-pill';
import { flag, dateRange, nights } from '@/lib/format';
import type { StopDoc, WithId } from '@/types/domain';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

type MarkerEntry = { marker: maplibregl.Marker; el: HTMLButtonElement };

function routeGeoJSON(points: WithId<StopDoc>[]): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: points.map((s) => [s.lng, s.lat]) },
  };
}

export function RouteMap({
  stops,
  bookingCounts = {},
}: {
  stops: WithId<StopDoc>[];
  bookingCounts?: Record<string, number>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const styleReadyRef = useRef(false);
  const didFitRef = useRef(false);
  const [selected, setSelected] = useState<WithId<StopDoc> | null>(null);

  // Sorted, geocoded stops only.
  const points = useMemo(
    () =>
      stops
        .filter(
          (s) => s.status !== 'cancelled' && typeof s.lat === 'number' && typeof s.lng === 'number'
        )
        .sort((a, b) => a.orderIdx - b.orderIdx),
    [stops]
  );

  // Latest points, readable from marker click handlers without re-binding them.
  const pointsRef = useRef(points);
  pointsRef.current = points;

  // A signature that changes whenever anything the map draws changes.
  const signature = points
    .map((p) => `${p.id}:${p.lat}:${p.lng}:${p.color}:${p.orderIdx}:${p.status}`)
    .join('|');

  // ── Init the map once ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPTILER_KEY) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [10.4, 48.5], // central Europe until stops load
      zoom: 4,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // Keep the WebGL canvas sized to the container (else it corner-renders).
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: routeGeoJSON(pointsRef.current) });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#1E4E80',
          'line-width': 3,
          'line-dasharray': [2, 1.5],
          'line-opacity': 0.7,
        },
      });
      styleReadyRef.current = true;
      // Trigger the sync effect now that the style is ready.
      map.fire('tc:styleready');
    });

    return () => {
      ro.disconnect();
      markersRef.current.forEach((e) => e.marker.remove());
      markersRef.current.clear();
      styleReadyRef.current = false;
      didFitRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Reconcile markers + route whenever stops change ────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sync = () => {
      // Markers don't require the style to be loaded, so reconcile them
      // immediately. Only the route line waits for the source to exist.
      const existing = markersRef.current;
      const seen = new Set<string>();

      points.forEach((stop, i) => {
        seen.add(stop.id);
        let entry = existing.get(stop.id);
        if (!entry) {
          const el = document.createElement('button');
          el.type = 'button';
          el.style.cssText =
            'width:30px;height:30px;border-radius:50%;color:#fff;font:600 13px/1 var(--ui),sans-serif;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer;';
          el.addEventListener('click', () => {
            const s = pointsRef.current.find((p) => p.id === stop.id);
            if (!s) return;
            setSelected(s);
            map.flyTo({ center: [s.lng, s.lat], zoom: 8, duration: 800 });
          });
          const marker = new maplibregl.Marker({ element: el }).setLngLat([
            stop.lng,
            stop.lat,
          ]);
          entry = { marker, el };
          existing.set(stop.id, entry);
          marker.addTo(map);
        }
        // Update mutable bits (order number, color, position, label).
        entry.el.textContent = String(i + 1);
        entry.el.style.background = stop.color;
        entry.el.setAttribute('aria-label', stop.city);
        entry.marker.setLngLat([stop.lng, stop.lat]);
      });

      // Remove markers for stops that are gone.
      existing.forEach((entry, id) => {
        if (!seen.has(id)) {
          entry.marker.remove();
          existing.delete(id);
        }
      });

      // Update the route line (only once the style/source exists).
      if (styleReadyRef.current) {
        const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined;
        src?.setData(routeGeoJSON(points));
      }

      // Fit bounds once, on first data.
      if (!didFitRef.current && points.length > 0) {
        const bounds = points.reduce(
          (b, s) => b.extend([s.lng, s.lat] as [number, number]),
          new maplibregl.LngLatBounds(
            [points[0].lng, points[0].lat],
            [points[0].lng, points[0].lat]
          )
        );
        map.fitBounds(bounds, { padding: 56, maxZoom: 8, duration: 0 });
        didFitRef.current = true;
      }
    };

    sync();
    // Re-run once the style loads so the route line draws too.
    if (!styleReadyRef.current) map.once('tc:styleready', sync);
    return () => {
      map.off('tc:styleready', sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (!MAPTILER_KEY) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <p className="text-sm text-text-dim">
          Map key not configured. Set <code className="font-mono">NEXT_PUBLIC_MAPTILER_KEY</code>.
        </p>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />

      <Drawer.Root open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-2xl border border-border bg-surface p-5 pb-8 outline-none">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
            {selected && (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-7 w-7 place-items-center rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: selected.color }}
                    >
                      {points.findIndex((s) => s.id === selected.id) + 1}
                    </span>
                    <h3 className="font-display text-lg font-semibold text-text">
                      {selected.city} {flag(selected.country)}
                    </h3>
                  </div>
                  <StatusPill status={selected.status} />
                </div>
                <p className="mt-2 text-sm text-text-dim">
                  {dateRange(selected.arriveOn, selected.departOn)} ·{' '}
                  <span className="tnum">{nights(selected.arriveOn, selected.departOn)}</span> nights
                  {selected.region ? ` · ${selected.region}` : ''}
                </p>
                {bookingCounts[selected.id] > 0 && (
                  <p className="mt-1 text-xs text-text-mute">
                    {bookingCounts[selected.id]} booking
                    {bookingCounts[selected.id] === 1 ? '' : 's'}
                  </p>
                )}
                {selected.notes && (
                  <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-text-dim">
                    {selected.notes}
                  </p>
                )}
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
