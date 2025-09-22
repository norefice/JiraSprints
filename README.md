# 🚀 JiraSprints Dashboard

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)](https://flask.palletsprojects.com/)
[![Jira API](https://img.shields.io/badge/Jira%20API-v3-orange.svg)](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Una aplicación web completa para visualizar, analizar y generar reportes detallados de sprints de JIRA. Proporciona métricas avanzadas de productividad, análisis comparativos entre sprints, y herramientas de exportación para facilitar la toma de decisiones en equipos ágiles.

## 📊 Características Principales

### 🎯 Dashboard Principal
- **Visualización de Sprints Activos**: Monitoreo en tiempo real de sprints actuales
- **Métricas de Productividad**: Velocity, story points completados, y horas trabajadas
- **Análisis de Worklogs**: Distribución detallada de tiempo por desarrollador y tipo de tarea
- **Exportación de Datos**: Reportes en Excel y CSV con análisis completo

### 📈 Métricas Avanzadas
- **Métricas de Productividad y Previsibilidad**:
  - Velocity (Story Points completados por sprint)
  - Fiabilidad del Compromiso (Say/Do Ratio)
  - Análisis de tendencias de los últimos 5 sprints
- **Métricas de Calidad y Salud del Producto**:
  - Distribución del Trabajo por tipo de issue
  - Métricas de Defectos (Bugs creados, resueltos, severidad)
  - Análisis de deuda técnica

### 🔄 Métricas Comparativas
- **Análisis Multi-Sprint**: Comparación de hasta 10 sprints del mismo board
- **Métricas de Equipo**:
  - Velocity y Productividad (completados vs estimados)
  - Distribución del Trabajo por tipo de issue
  - Calidad de Estimaciones
  - Gestión del Sprint
- **Métricas Individuales**:
  - Productividad Personal por desarrollador
  - Especialización y Carga de trabajo
  - Calidad Individual y precisión en estimaciones
- **Análisis Comparativo**:
  - Tendencias Temporales
  - Patrones de Trabajo
  - Recomendaciones Automáticas

### 📋 Reportes y Exportación
- **Sprint Analysis**: Reporte detallado con estado histórico de issues
- **Comparative Analysis**: Análisis comparativo multi-sprint
- **Formatos Soportados**: Excel (.xlsx) y CSV
- **Métricas Incluidas**:
  - Estado de issues al cierre del sprint
  - Worklogs filtrados por período del sprint
  - Análisis de estimaciones (Story Points vs Tiempo)
  - Métricas individuales y de equipo

## 🛠️ Tecnologías Utilizadas

- **Backend**: Python 3.8+, Flask
- **Frontend**: HTML5, CSS3, JavaScript, Materialize CSS
- **Visualización**: Chart.js
- **APIs**: Jira REST API v3
- **Procesamiento de Datos**: Pandas, OpenPyXL
- **Manejo de Fechas**: datetime, pytz

## 📋 Requisitos del Sistema

- **Python**: 3.8 o superior
- **Acceso a JIRA**: Cloud o Server con permisos de API
- **Token de API**: Generado desde la configuración de JIRA
- **Navegador Web**: Chrome, Firefox, Safari, Edge (moderno)

## 🚀 Instalación y Configuración

### 1. Clonar el Repositorio
```bash
git clone https://github.com/norefice/JiraSprints.git
cd JiraSprints
```

### 2. Crear entorno virtual (recomendado) e instalar dependencias

En Windows (PowerShell):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

En macOS/Linux:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configurar Credenciales

Copiar el archivo de ejemplo a `config.py` y editar con tus credenciales.

En Windows (PowerShell):
```powershell
Copy-Item config.example.py config.py
```

En macOS/Linux:
```bash
cp config.example.py config.py
```

Luego, edita `config.py` con tu URL, usuario y token de Jira.

### 4. Configuración de JIRA
Editar `config.py` con tus credenciales:

```python
JIRA_URL = "https://your-domain.atlassian.net/"
JIRA_USER = "your-email@domain.com"
JIRA_API_TOKEN = "your-api-token"
```

**Nota**: Para generar un API Token en JIRA Cloud:
1. Ve a [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Haz clic en "Create API token"
3. Dale un nombre descriptivo
4. Copia el token generado

### ⚠️ Recomendación de seguridad
- No compartas ni subas `config.py` con credenciales reales a repositorios públicos.
- Usa `config.example.py` como plantilla y mantén `config.py` fuera del control de versiones.
- Rotar el token si fue expuesto.

## 🎮 Uso de la Aplicación

### Iniciar el Servidor
```bash
python app.py
```

### Acceder a la Aplicación
Abrir el navegador y navegar a: `http://localhost:5000`

### Navegación por Funcionalidades

#### 🏠 Dashboard Principal
- Seleccionar Proyecto y Board
- Visualizar sprint activo actual
- Descargar análisis del sprint en Excel/CSV

#### 📊 Métricas
- Seleccionar Proyecto, Board y Sprint específico
- Ver métricas detalladas del sprint seleccionado
- Análisis de los últimos 5 sprints cerrados

#### 🔄 Métricas Comparativas
- Seleccionar múltiples sprints (hasta 10)
- Análisis comparativo completo
- Descargar reporte comparativo en Excel/CSV

## 🧭 Endpoints principales

### Vistas (Frontend)
- `GET /` → Dashboard principal
- `GET /metrics` → Métricas por sprint
- `GET /comparative-metrics` → Métricas comparativas multi-sprint
- `GET /active` → Vista de sprint activo (burndown, estado)

### API (Backend)
- Proyectos y tableros:
  - `GET /api/projects`
  - `GET /api/projects/<project_id>/boards`
  - `GET /api/boards/<board_id>/sprints`
- Sprint activo y métricas:
  - `GET /api/sprints/active/<board_id>`
  - `GET /api/metrics/velocity/<board_id>`
  - `GET /api/metrics/summary/<board_id>`
- Descargas por sprint:
  - `GET /api/sprints/<sprint_id>/issues/download` (XLSX)
  - `GET /api/sprints/<sprint_id>/worklogs/download` (XLSX)
  - `GET /api/sprints/<sprint_id>/analysis/download` (XLSX)
  - `GET /api/sprints/<sprint_id>/analysis/download_csv` (CSV)
- Métricas comparativas multi-sprint:
  - `POST /api/metrics/comparative` con body JSON: `{ "sprint_ids": [<id>, ...] }`
  - `GET /api/metrics/comparative/download_xlsx?sprint_ids=1,2,3`
  - `GET /api/metrics/comparative/download_csv?sprint_ids=1,2,3`

Nota: algunas rutas internas como `GET /api/sprints` pueden requerir configuración adicional y no se usan desde el frontend.

## 📊 Métricas y Análisis

### Escalas de Estimación
| Story Points | Rango de Horas |
|--------------|----------------|
| 1pt          | 0-2 horas      |
| 2pts         | 2-4 horas      |
| 3pts         | 4-8 horas      |
| 5pts         | 8-16 horas     |
| 8pts         | 16-24 horas    |

### Mapeo de Estados
| Estado JIRA | Categoría |
|-------------|-----------|
| Done        | completed |
| For Release | completed |
| CODE REVIEW | completed |
| In Progress | development |
| ToDo        | pending |
| Rejected    | rejected |

### Tipos de Issues
- **Task**: Tareas estimables en puntos
- **Story**: Funcionalidades estimables en puntos
- **Bug**: Errores o ajustes en la aplicación (no estimado en puntos, solo logueo de horas)
- **Spike**: Análisis, investigación, estimaciones (no estimado en puntos, solo logueo de horas)
- **Support**: Tareas de soporte técnico (no estimado en puntos, solo logueo de horas)

### Campos personalizados (Story Points)
La app usa el campo de Story Points para varias métricas. Ahora puedes configurar los IDs en `config.py` mediante `STORY_POINTS_FIELDS` (en orden de preferencia). Por defecto: `customfield_10030`, luego `customfield_10016`.

Si tu instancia de Jira usa otro ID de campo para Story Points, edita `STORY_POINTS_FIELDS` en `config.py`.

## 🔧 Configuración Avanzada

### Zona Horaria
La aplicación usa una zona horaria configurable vía `TIMEZONE` en `config.py` (por defecto `America/Sao_Paulo`). Cambia ese valor para ajustar conversiones y presentación de fechas.

### Personalización de Métricas
Puedes modificar las métricas y escalas de estimación en `app.py` según las necesidades de tu equipo.

## 🛠️ Solución de problemas

- "Timeout connecting to Jira" o "Jira API read timed out":
  - Verifica conectividad a `JIRA_URL` y que la VPN/Firewall no bloquee.
  - Reduce el rango de datos (menos sprints) y reintenta.
- 401/403 en llamadas a Jira:
  - Revisa `JIRA_USER` y `JIRA_API_TOKEN`.
  - Confirma permisos en el proyecto/board.
- Descargas vacías de worklogs:
  - Asegura que los worklogs estén dentro del rango de fechas del sprint.
  - Ajusta la zona horaria si tu equipo no está en UTC-3.

Si el problema persiste, abre un issue con logs y pasos para reproducir.

## 📁 Estructura del Proyecto

```
JiraSprints/
├── app.py                 # Aplicación principal Flask
├── jira_api.py           # Funciones de integración con JIRA API
├── config.py             # Configuración de credenciales
├── requirements.txt      # Dependencias de Python
├── README.md            # Este archivo
├── LICENSE              # Licencia MIT
├── static/              # Archivos estáticos
│   ├── css/
│   │   └── styles.css   # Estilos personalizados
│   ├── js/
│   │   ├── app.js       # JavaScript del dashboard principal
│   │   ├── metrics.js   # JavaScript de métricas
│   │   └── comparative_metrics.js  # JavaScript de métricas comparativas
│   └── favicon.ico      # Icono de la aplicación
└── templates/           # Plantillas HTML
    ├── index.html       # Dashboard principal
    ├── metrics.html     # Vista de métricas
    └── comparative_metrics.html  # Vista de métricas comparativas
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa la [documentación de JIRA API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
2. Verifica que tus credenciales sean correctas
3. Asegúrate de tener permisos adecuados en JIRA
4. Abre un issue en GitHub con detalles del problema

## 🎯 Roadmap

- [ ] Integración con Slack para notificaciones
- [ ] Dashboard en tiempo real con WebSockets
- [ ] Análisis predictivo de velocity
- [ ] Integración con herramientas de CI/CD
- [ ] API REST para integración con otras herramientas
- [ ] Soporte para múltiples zonas horarias
- [ ] Exportación a PDF con gráficos
- [ ] Métricas de satisfacción del equipo

---

**Desarrollado con ❤️ para equipos ágiles que buscan mejorar su productividad y visibilidad**
