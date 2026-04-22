#!/bin/bash

# ============ Script de Deployment para Hostinger VPS ============
# Este script automatiza el deployment en tu VPS

set -e  # Salir si hay error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Lux Viajes Portal - Deploy Script        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

# Función para imprimir mensajes
print_info() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# ============ Checks previos ============
print_info "Verificando requisitos..."

if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose no está instalado"
    exit 1
fi

print_info "Docker instalado: $(docker --version)"
print_info "Docker Compose instalado: $(docker-compose --version)"

# ============ Verificar archivos ============
print_info "Verificando archivos..."

if [ ! -f ".env" ]; then
    print_warning ".env no encontrado, creando desde .env.example..."
    cp .env.example .env
    print_warning "EDITA .env con tus valores reales!"
fi

if [ ! -f "serviceAccountKey.json" ]; then
    print_error "serviceAccountKey.json no encontrado!"
    print_error "Descárgalo desde Firebase Console"
    exit 1
fi

if [ ! -f "Dockerfile" ]; then
    print_error "Dockerfile no encontrado!"
    exit 1
fi

print_info "Todos los archivos requeridos están presentes"

# ============ Crear directorios ============
print_info "Creando directorios necesarios..."
mkdir -p logs
mkdir -p ssl
chmod 755 logs
print_info "Directorios creados"

# ============ Build y deploy ============
print_info "Compilando imagen Docker..."
docker-compose build --no-cache app

print_info "Iniciando contenedores..."
docker-compose up -d

print_info "Esperando que el servicio esté listo..."
sleep 5

# ============ Verificaciones ============
print_info "Verificando estado de los contenedores..."
docker-compose ps

print_info "Probando health check..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    print_info "Health check: OK ✓"
else
    print_warning "Health check: PENDIENTE (puede tardar 40 segundos)"
fi

# ============ Summary ============
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Deployment completado                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Aplicación disponible en: http://localhost:3000"
echo ""
echo "Comandos útiles:"
echo "  Ver logs:        docker-compose logs -f app"
echo "  Detener:         docker-compose down"
echo "  Reiniciar:       docker-compose restart app"
echo "  Ejecutar shell:  docker-compose exec app sh"
echo ""
echo "Documentación:"
echo "  Docker:          DOCKER_DEPLOYMENT.md"
echo "  Omada Cloud:     OMADA_CLOUD_SETUP.md"
echo "  Integración:     OMADA_INTEGRATION.md"
echo ""
