import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Configure test environment prior to app and model imports
os.environ["SAFEHER_ENV"] = "test"
os.environ["DEEPFACE_BACKEND_ENGINE"] = "pytorch"
