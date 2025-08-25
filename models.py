from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import businesses, offers

class Business(UserMixin):
    def __init__(self, id, email, name, password_hash, phone='', address='', latitude=0.0, longitude=0.0):
        self.id = str(id)
        self.email = email
        self.name = name
        self.password_hash = password_hash
        self.phone = phone
        self.address = address
        self.latitude = float(latitude)
        self.longitude = float(longitude)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    @staticmethod
    def create(email, name, password, phone='', address='', latitude=0.0, longitude=0.0):
        from app import business_counter, businesses, database_available
        
        if database_available:
            try:
                from app import db
                from models_db import DBBusiness
                password_hash = generate_password_hash(password)
                business = DBBusiness(
                    email=email,
                    name=name,
                    password_hash=password_hash,
                    phone=phone,
                    address=address,
                    latitude=float(latitude),
                    longitude=float(longitude)
                )
                db.session.add(business)
                db.session.commit()
                return business
            except Exception as e:
                pass  # Fall back to in-memory
        
        # In-memory storage
        global business_counter
        business_counter += 1
        
        password_hash = generate_password_hash(password)
        business = Business(business_counter, email, name, password_hash, phone, address, latitude, longitude)
        businesses[str(business_counter)] = business
        return business
    
    @staticmethod
    def get(business_id):
        return businesses.get(str(business_id))
    
    @staticmethod
    def get_by_email(email):
        for business in businesses.values():
            if business.email == email:
                return business
        return None
    
    def get_offers(self):
        business_offers = []
        for offer in offers.values():
            if offer.business_id == self.id:
                business_offers.append(offer)
        return business_offers

class Offer:
    def __init__(self, id, business_id, title, description, discount_percentage, valid_until, is_active=True):
        self.id = str(id)
        self.business_id = str(business_id)
        self.title = title
        self.description = description
        self.discount_percentage = int(discount_percentage)
        self.valid_until = valid_until
        self.is_active = is_active
    
    @staticmethod
    def create(business_id, title, description, discount_percentage, valid_until):
        from app import offer_counter, offers, database_available
        
        if database_available:
            try:
                from app import db
                from models_db import DBOffer
                offer = DBOffer(
                    business_id=business_id,
                    title=title,
                    description=description,
                    discount_percentage=int(discount_percentage),
                    valid_until=valid_until,
                    is_active=True
                )
                db.session.add(offer)
                db.session.commit()
                return offer
            except Exception as e:
                pass  # Fall back to in-memory
        
        # In-memory storage
        global offer_counter
        offer_counter += 1
        
        offer = Offer(offer_counter, business_id, title, description, discount_percentage, valid_until)
        offers[str(offer_counter)] = offer
        return offer
    
    @staticmethod
    def get(offer_id):
        return offers.get(str(offer_id))
    
    @staticmethod
    def get_all_active():
        active_offers = []
        for offer in offers.values():
            if offer.is_active:
                active_offers.append(offer)
        return active_offers
    
    def get_business(self):
        return Business.get(self.business_id)
    
    def update(self, title=None, description=None, discount_percentage=None, valid_until=None, is_active=None):
        if title is not None:
            self.title = title
        if description is not None:
            self.description = description
        if discount_percentage is not None:
            self.discount_percentage = int(discount_percentage)
        if valid_until is not None:
            self.valid_until = valid_until
        if is_active is not None:
            self.is_active = is_active
    
    def delete(self):
        if self.id in offers:
            del offers[self.id]
