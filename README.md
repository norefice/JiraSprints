# JIRA Sprints Dashboard

Una aplicación web para visualizar y analizar sprints de JIRA, incluyendo worklogs, story points y análisis de tareas.

## Características

- Visualización de sprints por proyecto y tablero
- Análisis detallado de worklogs
- Resumen de tareas por tipo
- Análisis de Story Points vs Tiempo
- Exportación de datos a Excel
- Gráficos de distribución de tareas
- Zona horaria ajustada a UTC-3

## Requisitos

- Python 3.8+
- Acceso a JIRA Cloud
- Token de API de JIRA

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/yourusername/JiraSprints.git
cd JiraSprints
```

2. Instalar dependencias:
```bash
pip install -r requirements.txt
```

3. Configurar la aplicación:
   - Copiar `config.example.py` a `config.py`
   - Actualizar las credenciales de JIRA en `config.py`

## Configuración

Editar `config.py` con tus credenciales de JIRA:

```python
JIRA_URL = "https://your-domain.atlassian.net/"
JIRA_USER = "your-email@domain.com"
JIRA_API_TOKEN = "your-api-token"
```

## Uso

1. Iniciar el servidor:
```bash
python app.py
```

2. Abrir en el navegador:
