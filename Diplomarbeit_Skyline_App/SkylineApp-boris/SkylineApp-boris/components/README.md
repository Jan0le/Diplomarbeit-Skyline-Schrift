# Skyline Project Components

This document describes the new components added to the Skyline project.

## SkylinePlane Component

A 3D airplane model that flies smoothly along a route on Google Maps using react-three-fiber.

### Features
- 3D airplane model rendered with Three.js
- Smooth animation along curved flight paths
- Automatic bearing calculation for correct airplane orientation
- Synchronized with Google Maps coordinates
- Configurable animation duration
- Floating animation effects

### Usage

```tsx
import SkylinePlane from '../components/SkylinePlane';

<SkylinePlane
  startCoordinate={{
    latitude: 40.7128,
    longitude: -74.0060
  }}
  endCoordinate={{
    latitude: 51.5074,
    longitude: -0.1278
  }}
  mapRef={mapRef}
  isVisible={true}
  duration={5000}
  onAnimationComplete={() => {
    console.log('Flight animation completed');
  }}
/>
```

### Props
- `startCoordinate`: Starting latitude/longitude coordinates
- `endCoordinate`: Destination latitude/longitude coordinates  
- `mapRef`: Reference to the MapView component
- `isVisible`: Boolean to show/hide the airplane
- `duration`: Animation duration in milliseconds (default: 5000)
- `onAnimationComplete`: Callback when animation finishes

### Integration
The component is already integrated into the map screen and will appear when viewing flight routes. It works alongside the existing 2D airplane marker and polyline route.

## BoardingPass Component

A swipeable boarding pass card with smooth dismiss animation.

### Features
- Realistic boarding pass design
- Swipe-to-dismiss gesture (swipe right)
- Smooth spring animations
- Customizable boarding pass data
- Visual swipe indicators

### Usage

```tsx
import BoardingPass, { BoardingPassData } from '../components/BoardingPass';

const boardingPassData: BoardingPassData = {
  flightNumber: 'LH441',
  airline: 'Lufthansa',
  from: {
    code: 'FRA',
    city: 'Frankfurt',
    time: '14:30',
  },
  to: {
    code: 'JFK',
    city: 'New York',
    time: '17:45',
  },
  passenger: {
    name: 'John Doe',
    seat: '12A',
  },
  gate: 'A23',
  terminal: '1',
  date: '15 Sep 2025',
  boardingTime: '13:45',
  class: 'Business',
};

<BoardingPass
  data={boardingPassData}
  onDismiss={() => {
    console.log('Boarding pass dismissed');
  }}
/>
```

### Props
- `data`: BoardingPassData object with flight information
- `onDismiss`: Callback function when the boarding pass is dismissed
- `style`: Optional additional styles

### BoardingPassData Interface
```tsx
interface BoardingPassData {
  flightNumber: string;
  airline: string;
  from: {
    code: string;
    city: string;
    time: string;
  };
  to: {
    code: string;
    city: string;
    time: string;
  };
  passenger: {
    name: string;
    seat: string;
  };
  gate: string;
  terminal: string;
  date: string;
  boardingTime: string;
  class: string;
}
```

### Integration
A demo screen has been created at `app/(tabs)/flight-test.tsx` showcasing the boarding pass component with multiple sample passes and interactive controls.

## Dependencies Added

The following dependencies were added to support these features:

```json
{
  "@react-three/fiber": "^8.x.x",
  "@react-three/drei": "^9.x.x", 
  "three": "^0.x.x",
  "react-native-gesture-handler": "~2.24.0"
}
```

Note: `react-native-gesture-handler` was already present in the project.

## Technical Notes

### 3D Rendering Performance
- The SkylinePlane component uses React Three Fiber for 3D rendering
- Animations are optimized using shared values and native drivers
- The airplane model is kept simple to maintain 60fps performance

### Gesture Handling
- BoardingPass uses PanGestureHandler for smooth swipe detection
- Spring animations provide natural feel for gesture responses

### Coordinate Conversion
- SkylinePlane includes coordinate-to-screen conversion utilities
- Currently uses simplified projection (can be enhanced with proper map projection)
- Integrates with existing Google Maps coordinate system

## Future Enhancements

### SkylinePlane
- Add GLTF/GLB model loading support for more realistic airplane models
- Implement proper map projection for accurate coordinate conversion
- Add altitude simulation for more realistic flight paths
- Support for multiple simultaneous flights

### BoardingPass
- Add zig-zag tear effect for more realistic boarding pass appearance
- Implement QR code generation for boarding passes
- Add boarding pass scanning functionality
- Support for different boarding pass layouts/airlines
