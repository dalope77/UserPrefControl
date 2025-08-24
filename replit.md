# Overview

GeoOfertas is a location-based offers platform that connects local businesses with nearby customers. The application allows businesses to register and create location-specific offers, while users can discover these offers through an interactive map interface when they are physically near the businesses. The platform uses geofencing technology to automatically detect when users are within range of offers and can send notifications accordingly.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Template System**: Flask-based Jinja2 templates with Bootstrap 5 dark theme for responsive UI
- **Interactive Maps**: Leaflet.js integration for real-time map visualization and geolocation services
- **Client-Side Geolocation**: JavaScript-based location tracking with configurable search radius and automatic position updates
- **Real-Time Updates**: Dynamic offer discovery and map marker management based on user location changes

## Backend Architecture
- **Web Framework**: Flask application with session-based authentication using Flask-Login
- **Authentication System**: Business-focused login system with password hashing via Werkzeug security
- **Data Models**: Simple class-based models for Business and Offer entities with in-memory storage
- **Geospatial Processing**: Haversine distance calculations for proximity-based offer filtering
- **API Endpoints**: RESTful routes for business registration, offer management, and location-based queries

## Data Storage
- **In-Memory Storage**: Python dictionaries for businesses and offers data with global counters for ID generation
- **Session Management**: Flask session handling with configurable secret keys
- **No Database**: Current implementation uses runtime memory storage (suitable for development/testing)

## Geolocation and Proximity Features
- **Geofencing Logic**: Custom implementation using haversine formula for accurate distance calculations
- **Configurable Radius**: User-adjustable search radius (default 1km) for discovering nearby offers
- **Real-Time Tracking**: Continuous location monitoring with position change notifications
- **Proximity Detection**: Automatic detection when users enter business geofence areas

## Business Management
- **Business Registration**: Multi-step onboarding with location coordinate capture
- **Offer Creation**: Business dashboard for creating and managing time-bound promotional offers
- **Location Validation**: Coordinate-based business positioning for accurate geofencing

# External Dependencies

## Frontend Libraries
- **Bootstrap 5**: UI framework with dark theme support from Replit CDN
- **Leaflet.js**: Open-source mapping library for interactive maps and geolocation
- **Font Awesome**: Icon library for UI elements and navigation
- **OpenStreetMap**: Tile provider for map visualization (no API key required)

## Backend Dependencies
- **Flask**: Core web framework for Python
- **Flask-Login**: User session management and authentication
- **Werkzeug**: Password hashing and security utilities

## Browser APIs
- **Geolocation API**: For accessing user's current location
- **Notification API**: For sending proximity-based alerts to users

## Development Tools
- **Logging**: Built-in Python logging for debugging and monitoring
- **Environment Variables**: Configuration management for session secrets and deployment settings