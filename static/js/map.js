// Global variables
let userMap;
let userMarker;
let businessMarkers = [];
let currentLocation = null;
let searchRadius = 1000; // meters
let autoUpdateInterval;
let notificationsEnabled = false;

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    requestLocationAndUpdate();
});

function initializeMap() {
    // Initialize map centered on Buenos Aires (default)
    userMap = L.map('userMap').setView([-34.6037, -58.3816], 13);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(userMap);
    
    // Custom icons
    window.userIcon = L.divIcon({
        className: 'user-marker',
        html: '<div style="background: #007bff; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,123,255,0.5);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    
    window.businessIcon = L.divIcon({
        className: 'business-marker',
        html: '<div style="background: #28a745; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(40,167,69,0.5);"></div>',
        iconSize: [15, 15],
        iconAnchor: [7, 7]
    });
}

function setupEventListeners() {
    // Radius slider
    const radiusSlider = document.getElementById('radiusSlider');
    const radiusValue = document.getElementById('radiusValue');
    
    radiusSlider.addEventListener('input', function() {
        searchRadius = parseInt(this.value);
        radiusValue.textContent = (searchRadius / 1000).toFixed(1) + ' km';
        
        if (currentLocation) {
            updateNearbyOffers();
        }
    });
    
    // Auto-update toggle
    const autoUpdateToggle = document.getElementById('autoUpdate');
    autoUpdateToggle.addEventListener('change', function() {
        if (this.checked) {
            startAutoUpdate();
        } else {
            stopAutoUpdate();
        }
    });
}

function requestLocationAndUpdate() {
    updateLocationStatus('Solicitando acceso a ubicación...', 'warning');
    
    if (!navigator.geolocation) {
        updateLocationStatus('Geolocalización no soportada', 'error');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            updateUserLocation(lat, lng);
            updateLocationStatus(`Ubicación detectada`, 'success');
            
            // Start auto-update if enabled
            if (document.getElementById('autoUpdate').checked) {
                startAutoUpdate();
            }
        },
        function(error) {
            let errorMessage = 'Error obteniendo ubicación';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Acceso a ubicación denegado';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Ubicación no disponible';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Timeout obteniendo ubicación';
                    break;
            }
            updateLocationStatus(errorMessage, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

function updateUserLocation(lat, lng) {
    currentLocation = { lat, lng };
    
    // Update map view
    userMap.setView([lat, lng], 15);
    
    // Update or create user marker
    if (userMarker) {
        userMap.removeLayer(userMarker);
    }
    
    userMarker = L.marker([lat, lng], { icon: userIcon })
        .addTo(userMap)
        .bindPopup('<strong>Tu ubicación</strong>');
    
    // Update location details
    document.getElementById('locationDetails').textContent = 
        `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
    
    // Load nearby offers
    updateNearbyOffers();
    
    // Load all businesses
    loadBusinessMarkers();
}

function updateNearbyOffers() {
    if (!currentLocation) return;
    
    const url = `/api/nearby_offers?lat=${currentLocation.lat}&lng=${currentLocation.lng}&radius=${searchRadius}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error:', data.error);
                return;
            }
            
            displayOffers(data.offers);
            
            // Check for proximity notifications
            checkProximityNotifications(data.offers);
        })
        .catch(error => {
            console.error('Error fetching offers:', error);
        });
}

function loadBusinessMarkers() {
    // Clear existing business markers
    businessMarkers.forEach(marker => userMap.removeLayer(marker));
    businessMarkers = [];
    
    fetch('/api/businesses')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error:', data.error);
                return;
            }
            
            data.businesses.forEach(business => {
                const marker = L.marker([business.latitude, business.longitude], { 
                    icon: businessIcon 
                })
                .addTo(userMap)
                .bindPopup(`
                    <strong>${business.name}</strong><br>
                    ${business.address}<br>
                    <small>${business.offers_count} ofertas activas</small>
                `);
                
                businessMarkers.push(marker);
            });
        })
        .catch(error => {
            console.error('Error fetching businesses:', error);
        });
}

function displayOffers(offers) {
    const offersContainer = document.getElementById('offersList');
    const offersCount = document.getElementById('offersCount');
    
    offersCount.textContent = offers.length;
    
    if (offers.length === 0) {
        offersContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <p class="text-muted">No hay ofertas en tu área actual</p>
                <p class="text-muted small">Intenta aumentar el radio de búsqueda</p>
            </div>
        `;
        return;
    }
    
    let offersHTML = '';
    offers.forEach(offer => {
        offersHTML += `
            <div class="border-bottom p-3 offer-item" data-business-lat="${offer.business_lat}" data-business-lng="${offer.business_lng}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-1">${offer.title}</h6>
                    <span class="badge bg-success">${offer.discount_percentage}% OFF</span>
                </div>
                <p class="mb-2 small text-muted">${offer.description}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <small class="text-muted">
                            <i class="fas fa-store me-1"></i>${offer.business_name}
                        </small><br>
                        <small class="text-muted">
                            <i class="fas fa-map-marker-alt me-1"></i>${offer.distance}m
                        </small>
                    </div>
                    <small class="text-muted">
                        Válida hasta ${new Date(offer.valid_until).toLocaleDateString()}
                    </small>
                </div>
            </div>
        `;
    });
    
    offersContainer.innerHTML = offersHTML;
    
    // Add click handlers to center map on business
    document.querySelectorAll('.offer-item').forEach(item => {
        item.addEventListener('click', function() {
            const lat = parseFloat(this.dataset.businessLat);
            const lng = parseFloat(this.dataset.businessLng);
            userMap.setView([lat, lng], 17);
        });
    });
}

function checkProximityNotifications(offers) {
    if (!notificationsEnabled || !currentLocation) return;
    
    offers.forEach(offer => {
        if (offer.distance <= 100) { // Within 100 meters
            showNotification(offer);
        }
    });
}

function showNotification(offer) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`¡Oferta cerca de ti!`, {
            body: `${offer.title} - ${offer.discount_percentage}% OFF en ${offer.business_name}`,
            icon: '/static/favicon.ico',
            tag: `offer-${offer.id}` // Prevent duplicate notifications
        });
        
        notification.onclick = function() {
            window.focus();
            userMap.setView([offer.business_lat, offer.business_lng], 17);
        };
    }
}

function refreshLocation() {
    requestLocationAndUpdate();
}

function toggleNotifications() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                updateNotificationStatus(permission === 'granted');
            });
        } else if (Notification.permission === 'granted') {
            notificationsEnabled = !notificationsEnabled;
            updateNotificationStatus(notificationsEnabled);
        } else {
            alert('Las notificaciones están bloqueadas. Habilítalas en la configuración del navegador.');
        }
    } else {
        alert('Tu navegador no soporta notificaciones.');
    }
}

function updateNotificationStatus(enabled) {
    notificationsEnabled = enabled;
    const statusElement = document.getElementById('notificationStatus');
    statusElement.textContent = enabled ? 'Desactivar Notificaciones' : 'Activar Notificaciones';
}

function updateLocationStatus(message, type) {
    const statusElement = document.getElementById('locationStatus');
    statusElement.textContent = message;
    
    // Remove existing classes
    statusElement.classList.remove('text-success', 'text-warning', 'text-danger');
    
    // Add appropriate class
    switch(type) {
        case 'success':
            statusElement.classList.add('text-success');
            break;
        case 'warning':
            statusElement.classList.add('text-warning');
            break;
        case 'error':
            statusElement.classList.add('text-danger');
            break;
    }
}

function startAutoUpdate() {
    stopAutoUpdate(); // Clear any existing interval
    
    autoUpdateInterval = setInterval(() => {
        if (currentLocation) {
            // Update location
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    updateUserLocation(position.coords.latitude, position.coords.longitude);
                },
                function(error) {
                    console.log('Auto-update location error:', error);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: 30000
                }
            );
        }
    }, 30000); // 30 seconds
}

function stopAutoUpdate() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
    }
}

// Initialize notifications status on load
document.addEventListener('DOMContentLoaded', function() {
    if ('Notification' in window && Notification.permission === 'granted') {
        updateNotificationStatus(false); // Start with notifications disabled
    }
});
