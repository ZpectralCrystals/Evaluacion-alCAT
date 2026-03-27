#!/bin/bash

# Matar procesos previos
kill -9 $(lsof -t -i:8000) 2>/dev/null
kill -9 $(lsof -t -i:5173) 2>/dev/null

echo "🚀 Iniciando entorno de desarrollo..."

# 1. Levantar el Backend (FastAPI)
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &

# 2. Levantar el Frontend
# REEMPLAZA 'frontend' por el nombre real de tu carpeta de frontend
cd frontend 
npm run dev -- --host 0.0.0.0 --port 5173