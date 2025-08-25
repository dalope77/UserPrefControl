# Database models for Supabase integration
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship

def get_db():
    from app import db
    return db

class DBBusiness(UserMixin, get_db().Model):
    __tablename__ = 'businesses'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(256), nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)
    
    # Relationship with offers
    offers = relationship('DBOffer', backref='business', lazy=True, cascade='all, delete-orphan')
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def get_offers(self):
        return self.offers

class DBOffer(get_db().Model):
    __tablename__ = 'offers'
    
    id = Column(Integer, primary_key=True)
    business_id = Column(Integer, ForeignKey('businesses.id'), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    discount_percentage = Column(Integer, nullable=False)
    valid_until = Column(String(10), nullable=False)
    is_active = Column(Boolean, default=True)
    
    def get_business(self):
        return self.business