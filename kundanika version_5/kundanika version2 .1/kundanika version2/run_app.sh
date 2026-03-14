#!/bin/bash

# Kill any existing processes on ports 3000 and 8000
fuser -k 3000/tcp 2>/dev/null
fuser -k 8000/tcp 2>/dev/null

# Start MongoDB if not running (systemd)
if ! pgrep -x "mongod" > /dev/null; then
    echo "Starting MongoDB..."
    if command -v systemctl &> /dev/null; then
        sudo systemctl start mongod
    else
        # Fallback for non-systemd or just trying to run it
        mongod --fork --logpath /var/log/mongodb/mongod.log
    fi
fi

# Start Backend
echo "Starting Backend..."
cd backend
source venv/bin/activate || source venv/Scripts/activate || echo "No venv found, trying global python"
uvicorn server:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo "Application started."
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait for user to exit
read -p "Press Enter to stop servers..."

kill $BACKEND_PID
kill $FRONTEND_PID
echo "Servers stopped."
