import 'leaflet/dist/leaflet.css';
import '@/lib/leafletIconFix';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Card } from '@/components/Card';
import { PageHeader } from '@/components/PageHeader';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useTravelSummary } from '@/domains/travel/api';
import { useApplications } from '@/domains/applications/api';

const DUBAI_CENTER: [number, number] = [25.2048, 55.2708];

export default function MapPage() {
  const tripQuery = useCurrentTrip();
  const travelSummaryQuery = useTravelSummary(tripQuery.data?.id);
  const applicationsQuery = useApplications(tripQuery.data?.id);

  const accommodation = travelSummaryQuery.data?.accommodation;
  const accommodationPin =
    accommodation && accommodation.lat !== null && accommodation.lng !== null
      ? { lat: accommodation.lat, lng: accommodation.lng, name: accommodation.name }
      : null;

  const visitPins = (applicationsQuery.data ?? []).flatMap((application) =>
    application.visits
      .filter((visit) => visit.lat !== null && visit.lng !== null)
      .map((visit) => ({
        id: visit.id,
        lat: visit.lat as number,
        lng: visit.lng as number,
        companyName: application.company_name,
        visitDate: visit.visit_date,
      })),
  );

  const markerCount = (accommodationPin ? 1 : 0) + visitPins.length;
  const center: [number, number] = accommodationPin ? [accommodationPin.lat, accommodationPin.lng] : DUBAI_CENTER;

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <PageHeader title="Map View" />

      <Card title="Map">
        <div className="h-72 w-full overflow-hidden rounded-md">
          <MapContainer center={center} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {accommodationPin && (
              <Marker position={[accommodationPin.lat, accommodationPin.lng]}>
                <Popup>{accommodationPin.name}</Popup>
              </Marker>
            )}
            {visitPins.map((pin) => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]}>
                <Popup>
                  {pin.companyName} — {pin.visitDate}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        {markerCount === 0 && (
          <p className="mt-2 text-sm text-text-secondary">
            No saved locations yet — PG and company-visit coordinates aren't captured by the chat flows yet, so the map centers
            on Dubai for now.
          </p>
        )}
      </Card>

      {accommodation && (
        <Card title="PG Accommodation">
          <p className="text-sm text-text-primary">{accommodation.name}</p>
          <p className="text-sm text-text-secondary">{accommodation.address}</p>
        </Card>
      )}

      {visitPins.length > 0 && (
        <Card title="Company Visit Locations">
          <ul className="flex flex-col gap-1 text-sm text-text-secondary">
            {visitPins.map((pin) => (
              <li key={pin.id}>
                {pin.companyName} — {pin.visitDate}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
