import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Leaflet's default marker icon resolves image URLs assuming a traditional
// script-tag setup; under Vite's bundler those paths 404 unless replaced with
// the actual hashed asset URLs. Side-effect import, run once.
interface IconDefaultPrototype {
  _getIconUrl?: () => string;
}
delete (L.Icon.Default.prototype as IconDefaultPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
