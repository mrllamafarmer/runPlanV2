from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import UserSettings
from schemas import SettingsUpdate, SettingsResponse
from cryptography.fernet import Fernet
import os

router = APIRouter()

# Simple encryption key (in production, this should be in environment variables)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    # Generate a new key if not set (for development only)
    ENCRYPTION_KEY = Fernet.generate_key().decode()
elif isinstance(ENCRYPTION_KEY, bytes):
    ENCRYPTION_KEY = ENCRYPTION_KEY.decode()

cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

def encrypt_value(value: str) -> str:
    """Encrypt a string value"""
    if not value:
        return None
    return cipher_suite.encrypt(value.encode()).decode()

def decrypt_value(value: str) -> str:
    """Decrypt a string value"""
    if not value:
        return None
    return cipher_suite.decrypt(value.encode()).decode()

@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Get user settings (creates default if not exists)"""
    settings = db.query(UserSettings).first()
    
    if not settings:
        # Create default settings
        settings = UserSettings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    # Decrypt API keys for response (mask them)
    response = SettingsResponse.model_validate(settings)
    if settings.openai_api_key:
        response.openai_api_key = "***" + decrypt_value(settings.openai_api_key)[-4:] if len(decrypt_value(settings.openai_api_key)) > 4 else "***"
    
    return response

@router.put("", response_model=SettingsResponse)
def update_settings(settings_update: SettingsUpdate, db: Session = Depends(get_db)):
    """Update user settings"""
    settings = db.query(UserSettings).first()
    
    if not settings:
        settings = UserSettings()
        db.add(settings)
    
    update_data = settings_update.model_dump(exclude_unset=True)
    
    # Encrypt API keys (but skip if it's a masked value from frontend)
    if 'openai_api_key' in update_data and update_data['openai_api_key']:
        # Don't re-encrypt if it's already encrypted (masked values start with ***)
        if not update_data['openai_api_key'].startswith('***'):
            update_data['openai_api_key'] = encrypt_value(update_data['openai_api_key'])
        else:
            # Remove masked value to avoid corrupting the stored key
            del update_data['openai_api_key']
    
    for key, value in update_data.items():
        setattr(settings, key, value)
    
    db.commit()
    db.refresh(settings)
    
    # Return masked response
    response = SettingsResponse.model_validate(settings)
    if settings.openai_api_key:
        decrypted = decrypt_value(settings.openai_api_key)
        response.openai_api_key = "***" + decrypted[-4:] if len(decrypted) > 4 else "***"
    
    return response

