import os
import glob
import re

router_files = glob.glob('app/routers/*.py')
for fpath in router_files:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'current_user: dict' in content:
        # Replace dict with User
        content = content.replace('current_user: dict', 'current_user: User')
        
        # Add import if missing
        if 'from app.models.user import User' not in content:
            # Insert after other imports
            content = content.replace('from fastapi', 'from app.models.user import User\nfrom fastapi')
            
        # Fix specific usages if any (e.g. current_user.get)
        content = content.replace('current_user.get("clearance_level", 1)', 'current_user.clearance_level')
        
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed {fpath}')
