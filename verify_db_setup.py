#!/usr/bin/env python3
"""
Database Setup Verification Script
Ensures all models are properly configured and database is complete.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def verify_models():
    """Verify all model classes are defined"""
    print("=" * 60)
    print("VERIFYING MODEL CLASSES")
    print("=" * 60)
    
    try:
        from models import (
            Event, Waypoint, CalculatedLeg, 
            Document, DocumentChunk, UserSettings,
            ChatSession, ChatMessage,
            WaypointType, DistanceUnit, ElevationUnit
        )
        
        models = [
            ('Event', Event),
            ('Waypoint', Waypoint),
            ('CalculatedLeg', CalculatedLeg),
            ('Document', Document),
            ('DocumentChunk', DocumentChunk),
            ('UserSettings', UserSettings),
            ('ChatSession', ChatSession),
            ('ChatMessage', ChatMessage),
        ]
        
        enums = [
            ('WaypointType', WaypointType, ['checkpoint', 'food', 'water', 'rest']),
            ('DistanceUnit', DistanceUnit, ['miles', 'kilometers']),
            ('ElevationUnit', ElevationUnit, ['meters', 'feet']),
        ]
        
        print("\n✅ Model Classes Found:")
        for name, model in models:
            table_name = model.__tablename__
            print(f"  - {name:20} → table: {table_name}")
        
        print("\n✅ Enum Types Found:")
        for name, enum_class, expected_values in enums:
            actual_values = [e.value for e in enum_class]
            match = "✅" if set(actual_values) == set(expected_values) else "❌"
            print(f"  {match} {name:20} → values: {actual_values}")
            if set(actual_values) != set(expected_values):
                print(f"     Expected: {expected_values}")
        
        return True, models, enums
        
    except ImportError as e:
        print(f"\n❌ ERROR: Could not import models: {e}")
        return False, [], []

def verify_init_db():
    """Verify init_db imports all models"""
    print("\n" + "=" * 60)
    print("VERIFYING init_db() IMPORTS")
    print("=" * 60)
    
    try:
        from database import init_db
        import inspect
        
        source = inspect.getsource(init_db)
        print("\n✅ init_db() function found")
        print("\nImports in init_db():")
        
        # Extract import statement
        import_line = [line for line in source.split('\n') if 'from models import' in line][0]
        print(f"  {import_line.strip()}")
        
        # Check each model
        required_models = [
            'Event', 'Waypoint', 'CalculatedLeg', 
            'Document', 'DocumentChunk', 'UserSettings',
            'ChatSession', 'ChatMessage'
        ]
        
        print("\n✅ Checking all models are imported:")
        all_present = True
        for model in required_models:
            present = model in import_line
            status = "✅" if present else "❌"
            print(f"  {status} {model}")
            if not present:
                all_present = False
        
        return all_present
        
    except Exception as e:
        print(f"\n❌ ERROR: Could not verify init_db: {e}")
        return False

def verify_init_sql():
    """Verify init.sql has all enum types"""
    print("\n" + "=" * 60)
    print("VERIFYING init.sql ENUM TYPES")
    print("=" * 60)
    
    try:
        with open('backend/init.sql', 'r') as f:
            content = f.read()
        
        expected_enums = {
            'waypoint_type': ['checkpoint', 'food', 'water', 'rest'],
            'distance_unit': ['miles', 'kilometers'],
            'elevation_unit': ['meters', 'feet'],
        }
        
        print("\n✅ Checking enum definitions:")
        all_present = True
        for enum_name, expected_values in expected_enums.items():
            present = f"CREATE TYPE {enum_name} AS ENUM" in content
            status = "✅" if present else "❌"
            print(f"  {status} {enum_name}")
            
            if present:
                # Verify values
                for value in expected_values:
                    if f"'{value}'" in content:
                        print(f"     ✅ {value}")
                    else:
                        print(f"     ❌ {value} MISSING")
                        all_present = False
            else:
                all_present = False
        
        # Check extensions
        print("\n✅ Checking PostgreSQL extensions:")
        extensions = ['vector', 'uuid-ossp']
        for ext in extensions:
            present = f"CREATE EXTENSION IF NOT EXISTS {ext}" in content or \
                     f'CREATE EXTENSION IF NOT EXISTS "{ext}"' in content
            status = "✅" if present else "❌"
            print(f"  {status} {ext}")
        
        return all_present
        
    except Exception as e:
        print(f"\n❌ ERROR: Could not verify init.sql: {e}")
        return False

def verify_table_names():
    """Verify table names match between models and expected schema"""
    print("\n" + "=" * 60)
    print("VERIFYING TABLE NAMES")
    print("=" * 60)
    
    try:
        from models import (
            Event, Waypoint, CalculatedLeg, 
            Document, DocumentChunk, UserSettings,
            ChatSession, ChatMessage
        )
        
        expected_tables = {
            'events': Event,
            'waypoints': Waypoint,
            'calculated_legs': CalculatedLeg,
            'documents': Document,
            'document_chunks': DocumentChunk,
            'user_settings': UserSettings,
            'chat_sessions': ChatSession,
            'chat_messages': ChatMessage,
        }
        
        print("\n✅ Verifying table names match expected:")
        all_match = True
        for expected_name, model in expected_tables.items():
            actual_name = model.__tablename__
            match = expected_name == actual_name
            status = "✅" if match else "❌"
            print(f"  {status} {model.__name__:20} → {actual_name:20} (expected: {expected_name})")
            if not match:
                all_match = False
        
        return all_match
        
    except Exception as e:
        print(f"\n❌ ERROR: Could not verify table names: {e}")
        return False

def main():
    """Run all verification checks"""
    print("\n" + "█" * 60)
    print("DATABASE SETUP VERIFICATION")
    print("█" * 60)
    
    checks = []
    
    # Run all checks
    models_ok, models, enums = verify_models()
    checks.append(('Models Defined', models_ok))
    
    init_db_ok = verify_init_db()
    checks.append(('init_db() Complete', init_db_ok))
    
    init_sql_ok = verify_init_sql()
    checks.append(('init.sql Complete', init_sql_ok))
    
    table_names_ok = verify_table_names()
    checks.append(('Table Names Match', table_names_ok))
    
    # Summary
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for check_name, passed in checks:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status} - {check_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL CHECKS PASSED - DATABASE SETUP IS COMPLETE!")
    else:
        print("❌ SOME CHECKS FAILED - REVIEW ERRORS ABOVE")
    print("=" * 60 + "\n")
    
    return 0 if all_passed else 1

if __name__ == '__main__':
    sys.exit(main())

