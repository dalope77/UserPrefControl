import os
import logging
from flask import Flask
from flask_login import LoginManager

# Set up logging for debugging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Por favor inicia sesión para acceder a esta página.'

# In-memory storage for businesses and offers (temporary, until Supabase is properly configured)
businesses = {}
offers = {}
offer_counter = 0
business_counter = 0

@login_manager.user_loader
def load_user(user_id):
    from models import Business
    return Business.get(user_id)

# Import routes after app initialization
from routes import *
