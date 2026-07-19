'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Drawer } from 'vaul';
import 'maplibre-gl/dist/maplibre-gl.css';
import { StatusPill } from '@/components/ui/status-pill';
import { flag, dateRange, nights } from '@/lib/format';
import type { StopDoc, WithId } from '@/types/domain';

const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

export function RouteMap({
  stops,
  bookingCounts = {},
}: {
  stops: WithId<StopDoc>[];
  bookingCounts?: Record<string, number>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selected, setSelected] = useState<WithId<StopDoc> | null>(null);

  // Sorted, geocoded stops only.
  const points = stops
    .filter((s) => s.status !== 'cancelled' && typeof s.lat === 'number' && typeof s.lng === 'number')
    .sort((a, b) => a.orderIdx - b.orderIdx);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || points.length === 0) return;
    if (!MAPTILER_KEY) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
      center: [points[0].lng, points[0].lat],
      zoom: 5,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    // Keep the WebGL canvas in sync with the container. Without this, a map
    // created before its container has laid out renders into a single corner.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    // Numbered, colored markers.
    points.forEach((stop, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', stop.city);
      el.style.cssText = `width:30px;height:30px;border-radius:50%;background:${stop.color};color:#fff;font:600 13px/1 var(--ui),sans-serif;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);cursor:pointer;`;
      el.textContent = String(i + 1);
      el.addEventListener('click', () => {
        setSelected(stop);
        map.flyTo({ center: [stop.lng, stop.lat], zoom: 8, duration: 800 });
      });
      new maplibregl.Marker({ element: el }).setLngLat([stop.lng, stop.lat]).addTo(map);
    });

    map.on('load', () => {
      // Route line through stops in order.
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: points.map((s) => [s.lng, s.lat]),
          },
        },
      });
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

      // Fit all stops in view.
      const bounds = points.reduce(
        (b, s) => b.extend([s.lng, s.lat]),
        new maplibregl.LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat])
      );
      map.fitBounds(bounds, { padding: 64, maxZoom: 8, duration: 0 });
    });

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);

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
