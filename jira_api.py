import requests
from requests.auth import HTTPBasicAuth
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import pytz
from config import JIRA_URL, JIRA_USER, JIRA_API_TOKEN, TIMEZONE, STORY_POINTS_FIELDS

# Usar las variables de configuración
# Normalizar URL base para evitar dobles slashes
URL = JIRA_URL.rstrip('/')
auth = HTTPBasicAuth(JIRA_USER, JIRA_API_TOKEN)

# Cliente HTTP resiliente con reintentos y timeouts
DEFAULT_TIMEOUT = (10, 60)  # (connect, read) en segundos

session = requests.Session()
retries = Retry(
    total=3,
    connect=3,
    read=3,
    status=3,
    backoff_factor=0.5,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods={"GET"},
)
adapter = HTTPAdapter(max_retries=retries)
session.mount("https://", adapter)
session.mount("http://", adapter)

def _get(url, params=None):
    response = session.get(url, auth=auth, params=params, timeout=DEFAULT_TIMEOUT)
    # Levantar excepción si no es 2xx
    response.raise_for_status()
    return response

def get_projects():
    url = f"{URL}/rest/api/3/project"
    response = _get(url)
    projects = response.json()
    projects.sort(key=lambda x: x['id'], reverse=True)
    return projects

def get_boards_for_project(project_id):
    url = f"{URL}/rest/agile/1.0/board?projectKeyOrId={project_id}"
    response = _get(url)
    boards = response.json()
    return boards['values']

def get_sprints_for_board(board_id):
    url = f"{URL}/rest/agile/1.0/board/{board_id}/sprint"
    response = _get(url)
    sprints = response.json()
    return sprints['values']

def get_sprints():
    url = f"{URL}/rest/agile/1.0/board/{BOARD_ID}/sprint"
    response = _get(url)
    sprints = response.json()['values']
    sprints.sort(key=lambda x: x['startDate'], reverse=True)
    return sprints

def get_issues_in_sprint(sprint_id):
    url = f"{URL}/rest/agile/1.0/sprint/{sprint_id}/issue?startAt=0&maxResults=500&expand=fields,changelog"
    response = _get(url)
    issues = response.json()['issues']
    for issue in issues:
        issue_type = issue['fields']['issuetype']
        issue_type['iconUrl'] = issue_type['iconUrl']
        # Normalizar Story Points en una clave común
        issue['fields']['story_points'] = get_story_points_from_fields(issue['fields'])
    return issues

def get_worklogs(issue_id):
    url = f"{URL}/rest/api/3/issue/{issue_id}/worklog"
    response = _get(url)
    worklogs = response.json()['worklogs']
    for worklog in worklogs:
        worklog['authorAvatar'] = worklog['author']['avatarUrls']['48x48']
    return worklogs

def convert_time_to_hours(time_spent):
    time_units = {
        'd': 8,
        'h': 1,
        'm': 1 / 60
    }
    total_hours = 0
    for part in time_spent.split():
        unit = part[-1]
        value = float(part[:-1])
        total_hours += value * time_units[unit]
    return total_hours

def filter_worklogs_by_sprint(worklogs, sprint_start, sprint_end):
    filtered_worklogs = []
    for worklog in worklogs:
        worklog_date = datetime.strptime(worklog['started'], '%Y-%m-%dT%H:%M:%S.%f%z')
        # Convertir worklog_date a la misma timezone que sprint_start y sprint_end
        worklog_date = worklog_date.astimezone(sprint_start.tzinfo)
        if sprint_start <= worklog_date <= sprint_end:
            filtered_worklogs.append(worklog)
    return filtered_worklogs

def format_date_to_utc3(date_str):
    """Convierte una fecha UTC a la zona horaria configurada y la formatea."""
    if not date_str:
        return ''
    utc = pytz.UTC
    configured_tz = pytz.timezone(TIMEZONE)
    date = datetime.strptime(date_str, '%Y-%m-%dT%H:%M:%S.%f%z')
    date_in_tz = date.astimezone(configured_tz)
    return date_in_tz.strftime('%Y-%m-%d %H:%M:%S')

def get_story_points_from_fields(fields):
    """
    Devuelve el valor numérico de Story Points tomando el primer campo
    configurado en STORY_POINTS_FIELDS que exista y sea no nulo.
    """
    for field_id in STORY_POINTS_FIELDS:
        value = fields.get(field_id)
        if value is None or value == '':
            continue
        try:
            return float(value)
        except Exception:
            continue
    return 0.0

def get_sprint_details(sprint_id):
    url = f"{URL}/rest/agile/1.0/sprint/{sprint_id}"
    response = _get(url)
    sprint = response.json()
    # Convertir fechas a UTC-3
    sprint['startDate'] = format_date_to_utc3(sprint.get('startDate'))
    sprint['endDate'] = format_date_to_utc3(sprint.get('endDate'))
    sprint['completeDate'] = format_date_to_utc3(sprint.get('completeDate'))
    return sprint

def get_issues_with_details(sprint_id):
    issues = get_issues_in_sprint(sprint_id)
    sprint_details = get_sprint_details(sprint_id)
    
    # Convertir las fechas de string a datetime objetos en UTC-3
    sprint_start = datetime.strptime(sprint_details['startDate'], '%Y-%m-%d %H:%M:%S')
    sprint_end_date = datetime.strptime(sprint_details['endDate'], '%Y-%m-%d %H:%M:%S').date()
    # Ajustar la hora de cierre del sprint a las 23:59:59
    sprint_end = datetime.combine(sprint_end_date, datetime.max.time().replace(hour=23, minute=59, second=59, microsecond=0))
    tz = pytz.timezone(TIMEZONE)
    sprint_start = tz.localize(sprint_start)
    sprint_end = tz.localize(sprint_end)
    
    with ThreadPoolExecutor() as executor:
        futures = {executor.submit(get_worklogs, issue['id']): issue for issue in issues}
        for future in futures:
            issue = futures[future]
            worklogs = future.result()
            filtered_worklogs = filter_worklogs_by_sprint(worklogs, sprint_start, sprint_end)
            for worklog in filtered_worklogs:
                worklog['timeSpentHours'] = convert_time_to_hours(worklog['timeSpent'])
            issue['worklogs'] = filtered_worklogs if filtered_worklogs else []
    return issues

def get_sprint_name(sprint_id):
    url = f"{URL}/rest/agile/1.0/sprint/{sprint_id}"
    response = _get(url)
    sprint = response.json()
    return sprint['name']

def get_task_summary(issues):
    task_summary = {}
    for issue in issues:
        issue_type = issue['fields']['issuetype']['name']
        if issue_type not in task_summary:
            task_summary[issue_type] = {'count': 0, 'total_hours': 0}
        task_summary[issue_type]['count'] += 1
        for worklog in issue['worklogs']:
            task_summary[issue_type]['total_hours'] += worklog['timeSpentHours']
    return task_summary
