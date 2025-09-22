# JIRA Configuration
JIRA_URL = "https://your-domain.atlassian.net/"
JIRA_USER = "your-email@domain.com"
JIRA_API_TOKEN = "your-api-token"

# Identificadores del campo de Story Points (en orden de preferencia)
# Ajusta estos IDs según tu instancia de Jira
STORY_POINTS_FIELDS = [
    "customfield_10030",
    "customfield_10016"
]

# Zona horaria para conversión y presentación de fechas
# Ejemplos: "America/Sao_Paulo", "America/Montevideo", "Europe/Madrid"
TIMEZONE = "America/Sao_Paulo"