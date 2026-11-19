import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AdvancedMarker, Map as GoogleMap, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

interface RoutePreviewMapProps {
  origin: string | { lat: number; lng: number };
  destination: string | { lat: number; lng: number };
  originLatLng?: { lat: number; lng: number };
  destinationLatLng?: { lat: number; lng: number };
}

const RoutePolylineOverlay: React.FC<RoutePreviewMapProps> = ({ origin, destination }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map || !routesLib || !origin || !destination) return;

    let cancelled = false;
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const request = {
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'viewport'],
    };

    (routesLib.Route as any)
      .computeRoutes(request)
      .then(({ routes }: { routes?: any[] }) => {
        if (cancelled || !routes || routes.length === 0) return;
        const primaryRoute = routes[0];
        if (typeof primaryRoute.createPolylines === 'function') {
          const newPolylines = primaryRoute.createPolylines();
          newPolylines.forEach((polyline: google.maps.Polyline) => {
            polyline.setOptions({
              strokeColor: '#2C3946',
              strokeWeight: 6,
              strokeOpacity: 0.92,
            });
            polyline.setMap(map);
          });
          polylinesRef.current = newPolylines;
        }
        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }
      })
      .catch(() => {
        // Silent in visual preview
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routesLib, origin, destination]);

  return null;
};

export const RoutePreviewMap: React.FC<RoutePreviewMapProps> = ({
  origin,
  destination,
  originLatLng,
  destinationLatLng,
}) => {
  const { t } = useTranslation();
  const defaultCenter = originLatLng || { lat: -20.3297, lng: -40.2925 };

  return (
    <div className="w-full h-[260px] rounded-[4px] overflow-hidden border border-[var(--border-light)] bg-[var(--ivory)]">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={defaultCenter}
        defaultZoom={12}
        gestureHandling="cooperative"
        disableDefaultUI={false}
        streetViewControl={false}
        mapTypeControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        <RoutePolylineOverlay origin={origin} destination={destination} />
        {originLatLng && (
          <AdvancedMarker position={originLatLng} title={t('simulator.steps.2')}>
            <Pin background="#0D0D0D" glyphColor="#FFFFFF" borderColor="#2C3946" />
          </AdvancedMarker>
        )}
        {destinationLatLng && (
          <AdvancedMarker position={destinationLatLng} title={t('simulator.steps.3')}>
            <Pin background="#C2A472" glyphColor="#0D0D0D" borderColor="#725A31" />
          </AdvancedMarker>
        )}
      </GoogleMap>
    </div>
  );
};
