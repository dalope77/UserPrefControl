// Geolocation utilities and helpers

class GeolocationManager {
    constructor() {
        this.currentPosition = null;
        this.watchId = null;
        this.callbacks = {
            onLocationUpdate: [],
            onLocationError: []
        };
    }
    
    // Check if geolocation is supported
    isSupported() {
        return 'geolocation' in navigator;
    }
    
    // Get current position once
    getCurrentPosition(options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.isSupported()) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            
            const defaultOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            };
            
            const geoOptions = { ...defaultOptions, ...options };
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentPosition = position;
                    this.notifyLocationUpdate(position);
                    resolve(position);
                },
                (error) => {
                    this.notifyLocationError(error);
                    reject(error);
                },
                geoOptions
            );
        });
    }
    
    // Watch position changes
    watchPosition(options = {}) {
        if (!this.isSupported()) {
            throw new Error('Geolocation not supported');
        }
        
        const defaultOptions = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000
        };
        
        const geoOptions = { ...defaultOptions, ...options };
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.currentPosition = position;
                this.notifyLocationUpdate(position);
            },
            (error) => {
                this.notifyLocationError(error);
            },
            geoOptions
        );
        
        return this.watchId;
    }
    
    // Stop watching position
    clearWatch() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }
    
    // Add callback for location updates
    onLocationUpdate(callback) {
        this.callbacks.onLocationUpdate.push(callback);
    }
    
    // Add callback for location errors
    onLocationError(callback) {
        this.callbacks.onLocationError.push(callback);
    }
    
    // Notify all location update callbacks
    notifyLocationUpdate(position) {
        this.callbacks.onLocationUpdate.forEach(callback => {
            try {
                callback(position);
            } catch (error) {
                console.error('Error in location update callback:', error);
            }
        });
    }
    
    // Notify all location error callbacks
    notifyLocationError(error) {
        this.callbacks.onLocationError.forEach(callback => {
            try {
                callback(error);
            } catch (error) {
                console.error('Error in location error callback:', error);
            }
        });
    }
    
    // Get distance between two points using Haversine formula
    static calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c; // Distance in meters
    }
    
    // Convert degrees to radians
    static toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    // Format distance for display
    static formatDistance(meters) {
        if (meters < 1000) {
            return Math.round(meters) + 'm';
        } else {
            return (meters / 1000).toFixed(1) + 'km';
        }
    }
    
    // Get location accuracy description
    static getAccuracyDescription(accuracy) {
        if (accuracy <= 10) {
            return 'Muy precisa';
        } else if (accuracy <= 50) {
            return 'Buena precisión';
        } else if (accuracy <= 100) {
            return 'Precisión moderada';
        } else {
            return 'Baja precisión';
        }
    }
    
    // Get error message from GeolocationPositionError
    static getErrorMessage(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return 'Acceso a la ubicación denegado por el usuario';
            case error.POSITION_UNAVAILABLE:
                return 'Información de ubicación no disponible';
            case error.TIMEOUT:
                return 'Tiempo agotado al obtener la ubicación';
            default:
                return 'Error desconocido al obtener la ubicación';
        }
    }
}

// Create global instance
window.geoManager = new GeolocationManager();

// Notification manager for proximity alerts
class ProximityNotificationManager {
    constructor() {
        this.notificationHistory = new Set();
        this.permissionRequested = false;
    }
    
    // Request notification permission
    async requestPermission() {
        if ('Notification' in window && !this.permissionRequested) {
            this.permissionRequested = true;
            return await Notification.requestPermission();
        }
        return Notification.permission;
    }
    
    // Check if notifications are supported and allowed
    canShowNotifications() {
        return 'Notification' in window && Notification.permission === 'granted';
    }
    
    // Show proximity notification
    showProximityNotification(offer, distance) {
        if (!this.canShowNotifications()) {
            return false;
        }
        
        const notificationKey = `${offer.id}-${Date.now().toString().slice(-6)}`;
        
        // Prevent duplicate notifications for same offer within 5 minutes
        const recentKey = `${offer.id}-recent`;
        if (this.notificationHistory.has(recentKey)) {
            return false;
        }
        
        this.notificationHistory.add(recentKey);
        setTimeout(() => {
            this.notificationHistory.delete(recentKey);
        }, 5 * 60 * 1000); // 5 minutes
        
        const notification = new Notification('¡Oferta cerca de ti!', {
            body: `${offer.title} - ${offer.discount_percentage}% OFF en ${offer.business_name} (${Math.round(distance)}m)`,
            icon: '/favicon.ico',
            tag: notificationKey,
            requireInteraction: false,
            silent: false
        });
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            notification.close();
        }, 10000);
        
        // Handle click
        notification.onclick = function() {
            window.focus();
            // Trigger map focus on business location
            if (window.userMap && offer.business_lat && offer.business_lng) {
                window.userMap.setView([offer.business_lat, offer.business_lng], 17);
            }
            notification.close();
        };
        
        return true;
    }
    
    // Clear notification history
    clearHistory() {
        this.notificationHistory.clear();
    }
}

// Create global notification manager
window.proximityNotifications = new ProximityNotificationManager();

// Utility functions for localStorage management
const LocationStorage = {
    // Save last known location
    saveLocation(position) {
        const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
        };
        localStorage.setItem('lastKnownLocation', JSON.stringify(locationData));
    },
    
    // Get last known location
    getLastLocation() {
        const saved = localStorage.getItem('lastKnownLocation');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.error('Error parsing saved location:', error);
                return null;
            }
        }
        return null;
    },
    
    // Clear saved location
    clearLocation() {
        localStorage.removeItem('lastKnownLocation');
    },
    
    // Check if saved location is still fresh (less than 10 minutes old)
    isLocationFresh(maxAge = 10 * 60 * 1000) {
        const location = this.getLastLocation();
        if (!location) return false;
        
        return (Date.now() - location.timestamp) < maxAge;
    }
};

// Export for use in other scripts
window.LocationStorage = LocationStorage;
