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

# In-memory storage for businesses and offers
businesses = {}
offers = {}
offer_counter = 0
business_counter = 0

# Database availability flag
database_available = False

# Try to setup database if available
try:
    from flask_sqlalchemy import SQLAlchemy
    from sqlalchemy.orm import DeclarativeBase
    from werkzeug.middleware.proxy_fix import ProxyFix
    
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
    
    class Base(DeclarativeBase):
        pass

    db = SQLAlchemy(model_class=Base)
    
    # Configure the database
    database_url = os.environ.get("DATABASE_URL")
    if database_url and database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
        
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
        "connect_args": {
            "connect_timeout": 10,
            "sslmode": "require"
        }
    }
    
    # Initialize the app with the extension
    db.init_app(app)
    
    with app.app_context():
        db.create_all()
        database_available = True
        logging.info("Database connection successful")
        
except Exception as e:
    logging.warning(f"Database connection failed, using in-memory storage: {e}")
    database_available = False

@login_manager.user_loader
def load_user(user_id):
    from models import Business
    return Business.get(user_id)

# Import routes after app initialization
from routes import *
