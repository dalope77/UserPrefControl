from flask import render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models import Business, Offer
from geofence import get_nearby_offers
from app import app
import logging

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        name = request.form.get('name', '').strip()
        password = request.form.get('password', '').strip()
        phone = request.form.get('phone', '').strip()
        address = request.form.get('address', '').strip()
        latitude = request.form.get('latitude', 0.0)
        longitude = request.form.get('longitude', 0.0)
        
        # Validation
        if not email or not name or not password:
            flash('Todos los campos obligatorios deben ser completados.', 'error')
            return render_template('register.html')
        
        # Check if business already exists
        if Business.get_by_email(email):
            flash('Ya existe un negocio registrado con este email.', 'error')
            return render_template('register.html')
        
        try:
            latitude = float(latitude) if latitude else 0.0
            longitude = float(longitude) if longitude else 0.0
        except ValueError:
            latitude = longitude = 0.0
        
        # Create business
        business = Business.create(email, name, password, phone, address, latitude, longitude)
        login_user(business)
        flash('¡Registro exitoso! Bienvenido a la plataforma.', 'success')
        return redirect(url_for('dashboard'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '').strip()
        
        if not email or not password:
            flash('Email y contraseña son requeridos.', 'error')
            return render_template('login.html')
        
        business = Business.get_by_email(email)
        if business and business.check_password(password):
            login_user(business)
            flash('¡Inicio de sesión exitoso!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Email o contraseña incorrectos.', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Has cerrado sesión exitosamente.', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard')
@login_required
def dashboard():
    offers = current_user.get_offers()
    return render_template('dashboard.html', offers=offers)

@app.route('/create_offer', methods=['POST'])
@login_required
def create_offer():
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    discount_percentage = request.form.get('discount_percentage', 0)
    valid_until = request.form.get('valid_until', '')
    
    if not title or not description or not discount_percentage or not valid_until:
        flash('Todos los campos son requeridos.', 'error')
        return redirect(url_for('dashboard'))
    
    try:
        discount_percentage = int(discount_percentage)
        if discount_percentage < 1 or discount_percentage > 90:
            flash('El porcentaje de descuento debe estar entre 1% y 90%.', 'error')
            return redirect(url_for('dashboard'))
    except ValueError:
        flash('Porcentaje de descuento inválido.', 'error')
        return redirect(url_for('dashboard'))
    
    offer = Offer.create(current_user.id, title, description, discount_percentage, valid_until)
    flash('¡Oferta creada exitosamente!', 'success')
    return redirect(url_for('dashboard'))

@app.route('/edit_offer/<offer_id>', methods=['POST'])
@login_required
def edit_offer(offer_id):
    offer = Offer.get(offer_id)
    if not offer or offer.business_id != current_user.id:
        flash('Oferta no encontrada.', 'error')
        return redirect(url_for('dashboard'))
    
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    discount_percentage = request.form.get('discount_percentage', offer.discount_percentage)
    valid_until = request.form.get('valid_until', offer.valid_until)
    is_active = request.form.get('is_active') == 'on'
    
    if not title or not description:
        flash('Título y descripción son requeridos.', 'error')
        return redirect(url_for('dashboard'))
    
    try:
        discount_percentage = int(discount_percentage)
        if discount_percentage < 1 or discount_percentage > 90:
            flash('El porcentaje de descuento debe estar entre 1% y 90%.', 'error')
            return redirect(url_for('dashboard'))
    except ValueError:
        flash('Porcentaje de descuento inválido.', 'error')
        return redirect(url_for('dashboard'))
    
    offer.update(title=title, description=description, discount_percentage=discount_percentage, 
                valid_until=valid_until, is_active=is_active)
    flash('Oferta actualizada exitosamente.', 'success')
    return redirect(url_for('dashboard'))

@app.route('/delete_offer/<offer_id>')
@login_required
def delete_offer(offer_id):
    offer = Offer.get(offer_id)
    if not offer or offer.business_id != current_user.id:
        flash('Oferta no encontrada.', 'error')
        return redirect(url_for('dashboard'))
    
    offer.delete()
    flash('Oferta eliminada exitosamente.', 'success')
    return redirect(url_for('dashboard'))

@app.route('/user_map')
def user_map():
    return render_template('user_map.html')

@app.route('/api/nearby_offers')
def api_nearby_offers():
    try:
        latitude = float(request.args.get('lat', 0))
        longitude = float(request.args.get('lng', 0))
        radius = float(request.args.get('radius', 1000))  # Default 1km radius
        
        if latitude == 0 or longitude == 0:
            return jsonify({'error': 'Ubicación inválida'}), 400
        
        nearby_offers = get_nearby_offers(latitude, longitude, radius)
        
        offers_data = []
        for offer, business, distance in nearby_offers:
            offers_data.append({
                'id': offer.id,
                'title': offer.title,
                'description': offer.description,
                'discount_percentage': offer.discount_percentage,
                'valid_until': offer.valid_until,
                'business_name': business.name,
                'business_address': business.address,
                'business_phone': business.phone,
                'business_lat': business.latitude,
                'business_lng': business.longitude,
                'distance': round(distance, 2)
            })
        
        return jsonify({
            'offers': offers_data,
            'count': len(offers_data)
        })
    
    except Exception as e:
        logging.error(f"Error getting nearby offers: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/businesses')
def api_businesses():
    try:
        businesses_data = []
        from app import businesses
        
        for business in businesses.values():
            if business.latitude != 0 and business.longitude != 0:
                active_offers = [offer for offer in business.get_offers() if offer.is_active]
                businesses_data.append({
                    'id': business.id,
                    'name': business.name,
                    'address': business.address,
                    'phone': business.phone,
                    'latitude': business.latitude,
                    'longitude': business.longitude,
                    'offers_count': len(active_offers)
                })
        
        return jsonify({'businesses': businesses_data})
    
    except Exception as e:
        logging.error(f"Error getting businesses: {e}")
        return jsonify({'error': 'Error interno del servidor'}), 500
